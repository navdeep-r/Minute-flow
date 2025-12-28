# Debug Steps for Caption Batch Streaming

## What I Added:
Console logs throughout the caption capture and streaming flow to help diagnose the issue.

## How to Test:

1. **Reload the Extension:**
   - Go to `chrome://extensions/`
   - Find "TranscripTonic" 
   - Click the reload icon 🔄

2. **Configure Webhook (if not already done):**
   - Click the extension icon in Chrome
   - Enter your webhook URL in the settings
   - Save it

3. **Start a Google Meet:**
   - Join or start a meeting at meet.google.com
   - Enable captions in the meeting

4. **Open Developer Console:**
   - Press F12 in the Google Meet tab
   - Go to the "Console" tab

## Expected Logs:

### On Meeting Start:
```
[Caption Batch] Initializing caption batch streaming...
[Caption Batch] Webhook URL: <your-url>
[Caption Batch] Body type: simple
[Caption Batch] Streaming ENABLED - Starting timer
[Caption Batch] Timer started - will flush every 30 seconds
```

### When Captions Appear:
```
[Caption Captured] John Doe: Hello everyone
[Caption Captured] You: Hi there
```

### Every 30 Seconds (or on meeting end):
```
[Caption Batch] Sending 5 caption(s) (reason: interval):
  1. [John Doe] Hello everyone
  2. [You] Hi there
  ...
[Caption Batch] Successfully sent 5 caption(s)
```

## Common Issues to Check:

### Issue 1: No initialization logs
- **Problem:** Extension not loading on Google Meet
- **Check:** Extension is enabled and reloaded

### Issue 2: "Streaming DISABLED - No webhook URL configured"
- **Problem:** Webhook URL not set
- **Solution:** Configure webhook URL in extension popup

### Issue 3: No caption capture logs
- **Problem:** Captions not being captured from DOM
- **Check:** 
  - Captions are enabled in the meeting
  - Google Meet UI hasn't changed (DOM selectors may be outdated)

### Issue 4: Captions captured but not sent
- **Problem:** Timer not firing or flush logic failing
- **Check logs for:**
  - "Timer started" message
  - Any errors in console
  - Network tab (F12 → Network) for POST requests to your webhook

### Issue 5: Timer started but no batches sent
- **Problem:** `isCaptionBatchStreamingEnabled` might be false
- **Check:** Look for any error messages or state changes

## Additional Debugging:

Run this in the console while in a Google Meet to check state:
```javascript
console.log("Meeting started:", hasMeetingStarted)
console.log("Streaming enabled:", isCaptionBatchStreamingEnabled)
console.log("Transcript length:", transcript.length)
console.log("Timer ID:", captionBatchTimerId)
```

Note: These variables won't be accessible if the content script scope is isolated. If that's the case, the console logs I added are your best diagnostic tool.
