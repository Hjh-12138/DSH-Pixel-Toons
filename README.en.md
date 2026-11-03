# DeepSeek Toons

[简体中文](README.md) · English

**A little company while you wait.**

<p>
  <img src="design/screenshots/reading-typing.gif" width="49%" alt="Reading and typing animation" />
  <img src="design/screenshots/character-walks-v0124.gif" width="49%" alt="Six characters walking" />
</p>

**Requirements:** DeepSeek Harness `0.2.1-rc.5`. Only Windows Web and Desktop clients have been verified. Desktop uses its bundled runtime; Web commands require Node.js `22.19.0` or later (locally verified with `24.12.0`) and npm. Source development also requires Git.

## Quick start

v0.1.28 supports Harness `0.2.1-rc.5`. Build its package from source; the historical [v0.1.24 release](https://github.com/Hjh-12138/DSH-Pixel-Toons/releases/tag/v0.1.24) requires Harness `0.2.0-rc.2`.

With Node.js and Git installed, run these PowerShell commands:

```powershell
git clone https://github.com/Hjh-12138/DSH-Pixel-Toons.git
Set-Location -LiteralPath .\DSH-Pixel-Toons
npm ci
New-Item -ItemType Directory -Force -Path .\dist | Out-Null
npm pack --pack-destination .\dist
```

For Desktop, verify the app runs Harness `0.2.1-rc.5`, add `dist/dsh-toons-0.1.28.tgz` in its plugin manager, enable `dsh-toons`, then fully quit and reopen. Keep the installed tarball: the profile may still reference its local path.

For Web, stop the existing service, then run from the source directory:

```powershell
npm install --global pnpm
$packagePath = (Resolve-Path -LiteralPath .\dist\dsh-toons-0.1.28.tgz).Path
npm exec -- dsh plugin --profile web add "$packagePath"
npm exec -- dsh --profile web
```

Continue only after each command succeeds. Existing source checkouts can first run `git pull --ff-only`. After upgrading Harness, reinstall dependencies and rebuild the package; an old tarball does not gain compatibility automatically. Desktop CLI instructions are in the [development guide](docs/development.md).

## Features and privacy

- Task animations for reading, typing, thinking, searching, checking and completion, with local idle roaming.
- Twelve pixel themes with day/dusk variants, the native Deep seek character, six tribute characters, and both pixel and HD whale-girl forms, plus local character/background imports.
- A pixel/HD toggle reveals the new form with a 650 ms sci-fi scan while keeping the current task and scene. Reduced-motion settings switch forms directly.
- Both forms provide thirteen corresponding actions with eight 125 ms frames each. Testing scans a chip, building assembles modules, Git manipulates branch nodes, and collaboration keeps two solid 45%-size clones working beside the main character. Their character proportions, action phases and durations match.
- Collapsible controls, narrow-window layouts and support for reduced motion.
- Thumbnail character cards group both whale-girl forms under one character. Full artwork loads on demand and decoded images are reused across form/background changes.
- Optional dynamic mode generates Chinese text bubbles and combines existing scene assets, with fallback and separate token accounting.

The 0.1.28 source includes the dual forms, matching pixel work actions, and the revised native Deep seek walk. It also updates compatibility for Harness 0.2.1-rc.5; use the [source installation guide](docs/development.md#从源码安装) to build the new version. Historical screenshots retain their original version labels.

> [!IMPORTANT]
> **Dynamic mode sends task summaries to your configured model and adds model usage.** Summaries may include tool names, paths, commands, search terms, URLs or a short excerpt of user input. Default preset mode plays locally and makes no extra model requests for the animation.

Dynamic mode uses your session's provider/model unless overridden. It also sends the task phase, failure flag and character instructions; it does not copy the full main conversation, and the animation director does not execute tools. Truncation is not redaction. Imported resources stay in the current client's storage; usage logging is disabled by default. Normal chat model requests are separate from the animation mode.

## Customize and develop

Use the “本地资源” (local resources) panel to select a character or import ZIP/embedded-image JSON packs. Character and scene selections are independent. See [resource pack format](docs/local-resource-packs.md), [dynamic mode](docs/dynamic-scenes.md), [development notes](docs/development.md), [Windows auto-update](docs/desktop-auto-update.md) and [CHANGELOG](CHANGELOG.md). Detailed guides are currently in Chinese.

An unset character selection starts with the pixel whale girl. Select either whale-girl form to show the pixel/HD buttons. Selecting “Deep seek” keeps the original blue-eyed, blue-and-white maid character across refreshes; its revised walk reuses the idle artwork without changing body or shoe proportions. “恢复初始设置” returns to the pixel whale girl and preset scenes. See [walking assets](design/character-walks.md) and [dual-form actions](design/whale-dual-forms.md).

After `npm ci`, run `npm run typecheck`, `npm test` or `npm run preview`. The preview at `http://127.0.0.1:3088/` uses simulated dynamic scenes without model calls.

Run `npm run characters:check` to generate the character comparison sheets and validate all 208 whale-girl frames; `npm run characters:review` starts a local comparison server at `http://127.0.0.1:3096/`. Editable HD layers and rebuild instructions are archived in the [character source project](design/whale-source/README.md).

The current source reduces the install tarball from about 117 MB to 52 MB, and the production client from 19.6 MB to 0.32 MB. See [loading and automated checks](docs/performance.md) for measurements and CI commands.

## Troubleshooting and uninstall

If the strip is missing, check the selected profile, plugin enablement and `enabled: true`, then restart the client or expand the collapsed strip. `pnpm was not found` means pnpm must be available on PATH. Compatibility failures may report `incompatible-version` or peer dependency errors; use Harness `0.2.1-rc.5` for the actual client as well as the CLI.

If Desktop auto-update is enabled, unregister its task first:

```powershell
Unregister-ScheduledTask -TaskName DSH-Toons-AutoUpdate -Confirm:$false
```

For Web, stop the service and run from the source directory using the CLI installed in Quick start:

```powershell
npm exec -- dsh plugin --profile web remove dsh-toons
```

For Desktop, remove `dsh-toons` in the plugin manager. Restart afterwards. Removing the plugin does not clear locally imported resources.

Report bugs through the [Issue form](https://github.com/Hjh-12138/DSH-Pixel-Toons/issues/new?template=bug_report.yml), including Harness version, OS, reproduction steps and screenshots. Use [Discussions](https://github.com/Hjh-12138/DSH-Pixel-Toons/discussions) for questions and feature ideas.

## Credits and disclaimer

Adapted from [claude-toons](https://github.com/achimala/claude-toons) under MIT, using [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) plugin interfaces. See [third-party notices](THIRD_PARTY_NOTICES.md) and [LICENSE](LICENSE).

This is an unofficial fan/tribute project, with no affiliation, partnership or endorsement from the companies behind DeepSeek, Kimi, Gemini, Claude, Qwen, Grok, GLM or the referenced games. Game themes include Rhodes Island, Honkai: Star Rail, Arknights: Endfield and Genshin Impact. Related names, brands and characters remain the property of their respective rights holders; the code's MIT license does not grant those third-party rights.
