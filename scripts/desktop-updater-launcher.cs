using System;
using System.Diagnostics;
using System.IO;
using System.Text;

public sealed class DesktopUpdaterResult
{
    public int ExitCode;
    public string Output;
    public string Error;
}

// Compiled as a Windows application by setup: no console is allocated, even
// before PowerShell starts. The updater uses the same runner for every child.
public static class DesktopUpdaterProcess
{
    private static string Quote(string value)
    {
        // Escape quotes and trailing backslashes for Windows' argv parser.
        var quoted = new StringBuilder("\"");
        int backslashes = 0;
        foreach (char character in value)
        {
            if (character == '\\') { backslashes++; continue; }
            if (character == '"') quoted.Append('\\', backslashes * 2 + 1);
            else quoted.Append('\\', backslashes);
            quoted.Append(character);
            backslashes = 0;
        }
        quoted.Append('\\', backslashes * 2);
        return quoted.Append('"').ToString();
    }

    public static DesktopUpdaterResult Run(string executable, string[] arguments, string workingDirectory)
    {
        var start = new ProcessStartInfo();
        start.FileName = executable;
        start.WorkingDirectory = workingDirectory;
        start.UseShellExecute = false;
        start.CreateNoWindow = true;
        start.WindowStyle = ProcessWindowStyle.Hidden;
        start.RedirectStandardOutput = true;
        start.RedirectStandardError = true;
        start.StandardOutputEncoding = Encoding.UTF8;
        start.StandardErrorEncoding = Encoding.UTF8;
        var command = new StringBuilder();
        string extension = Path.GetExtension(executable).ToLowerInvariant();
        if (extension == ".cmd" || extension == ".bat")
        {
            start.FileName = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), "cmd.exe");
            // Expand each value once, inside quotes. Spaces, &, parentheses and
            // literal % in configured paths must not become shell commands.
            start.EnvironmentVariables["TOONS_COMMAND"] = executable;
            command.Append("/d /v:off /s /c \"\"%TOONS_COMMAND%\"");
            for (int i = 0; i < arguments.Length; i++)
            {
                string key = "TOONS_ARGUMENT_" + i;
                if (arguments[i].IndexOf('"') >= 0 || arguments[i].IndexOf('\r') >= 0 || arguments[i].IndexOf('\n') >= 0)
                    throw new ArgumentException("Batch command arguments cannot contain quotes or newlines.");
                start.EnvironmentVariables[key] = Quote(arguments[i]);
                command.Append(" %" + key + "%");
            }
            command.Append('"');
        }
        else
        {
            if (extension == ".ps1")
            {
                start.FileName = PowerShellPath();
                command.Append("-NoProfile -NonInteractive -ExecutionPolicy Bypass -File " + Quote(executable) + " ");
            }
            foreach (string argument in arguments) command.Append(Quote(argument) + " ");
        }
        start.Arguments = command.ToString();
        using (var process = new Process())
        {
            process.StartInfo = start;
            process.Start();
            // Drain both pipes concurrently, including large build diagnostics.
            var output = process.StandardOutput.ReadToEndAsync();
            var error = process.StandardError.ReadToEndAsync();
            process.WaitForExit();
            return new DesktopUpdaterResult { ExitCode = process.ExitCode,
                Output = output.GetAwaiter().GetResult(), Error = error.GetAwaiter().GetResult() };
        }
    }

    private static string PowerShellPath()
    {
        return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System),
            @"WindowsPowerShell\v1.0\powershell.exe");
    }

    public static int Main(string[] args)
    {
        if (args.Length != 2) return 1;
        string directory = AppDomain.CurrentDomain.BaseDirectory;
        try
        {
            directory = Path.GetDirectoryName(Path.GetFullPath(args[1]));
            var result = Run(PowerShellPath(), new[] { "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
                "-File", args[0], "-ConfigPath", args[1] }, directory);
            if (result.ExitCode != 0) LogFailure(directory, result.Output + result.Error);
            return result.ExitCode;
        }
        catch (Exception error)
        {
            LogFailure(directory, error.ToString());
            return 1;
        }
    }

    private static void LogFailure(string directory, string message)
    {
        try { File.AppendAllText(Path.Combine(directory, "launcher.log"), DateTimeOffset.Now.ToString("o") + " " + message + Environment.NewLine, Encoding.UTF8); }
        catch { /* A background failure must never open an error dialog. */ }
    }
}
