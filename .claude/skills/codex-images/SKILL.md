---
name: codex-images
description: Generate images (anime background paintings, layers on magenta, character poses) with the OpenAI Codex CLI signed in to the owner's own ChatGPT subscription, then cut out the magenta. Use when the film needs painted art. Covers install, the owner's device-code login, generating, collecting the files, cutting out, and logging out.
---

# Images through Codex (the owner's ChatGPT subscription)

Code draws light, motion, weather and type; paintings and people come from an
image model. The owner has a ChatGPT subscription (no API key), so images are
made with the **Codex CLI** signed in to that subscription. This is OpenAI's
supported way to use a subscription from a terminal.

## Rules
- **Never ask for or accept the owner's password, API key or tokens in chat.**
  The owner signs in themselves with the device code.
- Stay signed in: the owner said *"dont log out till i ask"* (round 18). Log out only when they ask.
- Generated images use the owner's plan limits: generate what's needed, don't spray retries.
- Original art only: no copyrighted characters, no logos, no text in images.

## 1. Install (once per container)
```sh
npm i -g @openai/codex
codex features list | grep image_generation   # must say: stable true
```

## 2. Network
The environment must allow these hosts (owner sets it: session title bar →
cloud environment → Edit → Network access → Custom → Allowed domains, keeping
the defaults): `chatgpt.com`, `auth.openai.com`, `api.openai.com`.
Check: `curl -s -o /dev/null -w "%{http_code}" https://chatgpt.com` → not `000`.

## 3. The owner signs in (device code)
Run in the background and read its output; it prints a URL and a one-time code:
```sh
codex login --device-auth
codex login status    # afterwards: "Logged in using ChatGPT"
```
Give the owner the URL and the code, nothing else. They open it on their own
device, sign in to ChatGPT and enter the code.

## 4. Generate
One image per call, from the repo root, into `art/raw/`:
```sh
mkdir -p art/raw
codex exec --skip-git-repo-check --full-auto \
  "Use your image generation tool to create ONE image and save it as art/raw/<name>.png. \
   <STYLE BLOCK> <THE IMAGE'S PROMPT>"
```
- Keep one shared STYLE BLOCK for a set so everything matches (see docs/STORY.md for the current set).
- Layers: ask for the object on flat solid magenta `#FF00FF`, everything else magenta, no shadows on it.
- Portrait 2:3 (1024×1536) unless the image is a pan (then wide).
- After each image, look at it (Read the PNG). Redo only what's actually wrong.
- If Codex saves elsewhere, find it: `ls -t ~/.codex/**/*.png art/raw 2>/dev/null | head`.

## 5. Cut out
`python3 scripts/cutout.py` keys the magenta to alpha with no pink fringe and
writes WebP into `src/assets/...` (see the script's header). Skies are kept as full images.

## 6. Log out
```sh
codex logout && codex login status
```
