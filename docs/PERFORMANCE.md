# Measuring Pixi on a real phone

Numbers from this repo's CI and from headless Chrome are **not** device numbers: they use a software GPU that draws a frame in about half a second. Only the phone tells the truth.

## Budgets

| What | Budget | Why |
|---|---|---|
| Viewfinder frame | 16.7 ms (60 fps), 95th percentile under 33 ms | Anything slower reads as lag in the hand |
| Shutter → photo on screen | under 100 ms | Feels instant |
| Shutter → full photo in the roll | under 300 ms on a mid-range phone | Fast enough to keep shooting |
| Develop animation | 60 fps, no stutters | It is the signature moment |

## In the app (no cable needed)

1. Settings → Performance → turn on **Frame meter**.
2. Go to the camera. The meter in the corner shows fps, median and 95th-percentile frame time, stutters, and shutter times. Green is inside budget, amber is not.
3. Take five photos. Go back to Settings → Performance for the summary.

The viewfinder lowers its own resolution when the phone is slow (it trades sharpness, never frame rate), so a phone that starts amber should turn green within a couple of seconds.

## With Chrome remote debugging (for detail)

1. On the phone: Developer options → USB debugging on. Connect by USB.
2. On the computer: open `chrome://inspect/#devices`, find the Pixi WebView, click **inspect**.
3. Performance tab → record 10 seconds: hold on the viewfinder, take two photos, let them develop.
4. Look for long tasks (red corners) during the develop and the shutter, and the GPU row for frames over 16.7 ms.

Send me a screenshot of the meter, or the exported profile, and I'll fix what it shows.
