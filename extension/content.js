// @ts-check
/// <reference path="../types/chrome.d.ts" />
/// <reference path="../types/index.js" />


//*********** GLOBAL VARIABLES **********//
/** @type {ExtensionStatusJSON} */
const extensionStatusJSON_bug = {
  status: 400,
  message: `<strong>MINUTE FLOW encountered a new error</strong> <br /> Please report it at https://github.com/vivek-nexus/MINUTE FLOW/issues`
}
/** @type {MutationObserverInit} */
const mutationConfig = { childList: true, attributes: true, subtree: true, characterData: true }

// Name of the person attending the meeting
let userName = "You"

// Transcript array that holds one or more transcript blocks
/** @type {TranscriptBlock[]} */
let transcript = []

// Buffer variables to dump values, which get pushed to transcript array as transcript blocks, at defined conditions
/**
   * @type {HTMLElement | null}
   */
let transcriptTargetBuffer
let personNameBuffer = "", transcriptTextBuffer = "", timestampBuffer = ""

// Chat messages array that holds one or more chat messages of the meeting
/** @type {ChatMessage[]} */
let chatMessages = []

/** @type {MeetingSoftware} */
const meetingSoftware = "Google Meet"

// Capture meeting start timestamp, stored in ISO format
let meetingStartTimestamp = new Date().toISOString()
let meetingTitle = document.title

// Capture invalid transcript and chatMessages DOM element error for the first time and silence for the rest of the meeting to prevent notification noise
let isTranscriptDomErrorCaptured = false
let isChatMessagesDomErrorCaptured = false

// Capture meeting begin to abort userName capturing interval
let hasMeetingStarted = false

// Capture meeting end to suppress any errors
let hasMeetingEnded = false

/** @type {ExtensionStatusJSON} */
let extensionStatusJSON = { status: 200, message: "<strong>Minute Flow is listening</strong> <br />" }

const CAPTION_BATCH_INTERVAL_MS = 30000
/** @type {number | null} */
let captionBatchTimerId = null
let isCaptionBatchStreamingEnabled = false
/** @type {"simple" | "advanced"} */
let captionBatchBodyType = "simple"
let lastStreamedTranscriptIndex = 0
let lastStreamedBufferLength = 0


window.addEventListener("beforeunload", () => {
  stopCaptionBatchTimer(true)
})

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") {
    return
  }

  if (changes.webhookBodyType && changes.webhookBodyType.newValue) {
    captionBatchBodyType = changes.webhookBodyType.newValue === "advanced" ? "advanced" : "simple"
  }

  if (Object.prototype.hasOwnProperty.call(changes, "webhookUrl") && hasMeetingStarted) {
    const webhookChange = changes.webhookUrl
    console.log("[Caption Batch] Webhook URL changed:", webhookChange?.newValue || "REMOVED")
    if (webhookChange?.newValue) {
      isCaptionBatchStreamingEnabled = true
      startCaptionBatchTimer()
    }
    else {
      isCaptionBatchStreamingEnabled = false
      stopCaptionBatchTimer(false)
    }
  }
})





// Attempt to recover last meeting, if any. Abort if it takes more than 2 seconds to prevent current meeting getting messed up.
Promise.race([
  recoverLastMeeting(),
  new Promise((_, reject) =>
    setTimeout(() => reject({ errorCode: "016", errorMessage: "Recovery timed out" }), 2000)
  )
]).
  catch((error) => {
    const parsedError = /** @type {ErrorObject} */ (error)
    if ((parsedError.errorCode !== "013") && (parsedError.errorCode !== "014")) {
      console.error(parsedError.errorMessage)
    }
  }).
  finally(() => {
    // Save current meeting data to chrome storage once recovery is complete or is aborted
    overWriteChromeStorage(["meetingSoftware", "meetingStartTimestamp", "meetingTitle", "transcript", "chatMessages"], false)
  })




  // Enable extension functions only if status is 200
  if (extensionStatusJSON.status === 200) {
    // NON CRITICAL DOM DEPENDENCY. Attempt to get username before meeting starts. Abort interval if valid username is found or if meeting starts and default to "You".
    waitForElement(".awLEm").then(() => {
      // Poll the element until the textContent loads from network or until meeting starts
      const captureUserNameInterval = setInterval(() => {
        if (!hasMeetingStarted) {
          const capturedUserName = document.querySelector(".awLEm")?.textContent
          if (capturedUserName) {
            userName = capturedUserName
            clearInterval(captureUserNameInterval)
          }
        }
        else {
          clearInterval(captureUserNameInterval)
        }
      }, 100)
    })

    // 1. Meet UI prior to July/Aug 2024
    // meetingRoutines(1)

    // 2. Meet UI post July/Aug 2024
    meetingRoutines(2)
  }
  else {
    // Show downtime message as extension status is 400
    showNotification(extensionStatusJSON)
  }



/**
 * @param {number} uiType
 */
function meetingRoutines(uiType) {
  const meetingEndIconData = {
    selector: "",
    text: ""
  }
  const captionsIconData = {
    selector: "",
    text: ""
  }
  // Different selector data for different UI versions
  switch (uiType) {
    case 1:
      meetingEndIconData.selector = ".google-material-icons"
      meetingEndIconData.text = "call_end"
      captionsIconData.selector = ".material-icons-extended"
      captionsIconData.text = "closed_caption_off"
      break
    case 2:
      meetingEndIconData.selector = ".google-symbols"
      meetingEndIconData.text = "call_end"
      captionsIconData.selector = ".google-symbols"
      captionsIconData.text = "closed_caption_off"
    default:
      break
  }

  // CRITICAL DOM DEPENDENCY. Wait until the meeting end icon appears, used to detect meeting start
  waitForElement(meetingEndIconData.selector, meetingEndIconData.text).then(() => {
    console.log("Meeting started")
    /** @type {ExtensionMessage} */
    const message = {
      type: "new_meeting_started"
    }
    chrome.runtime.sendMessage(message, function () { })
    hasMeetingStarted = true
    // Update meeting startTimestamp
    meetingStartTimestamp = new Date().toISOString()
    overWriteChromeStorage(["meetingStartTimestamp"], false)
    initializeCaptionBatchStreaming()


    //*********** MEETING START ROUTINES **********//
    updateMeetingTitle()

    /** @type {MutationObserver} */
    let transcriptObserver
    /** @type {MutationObserver} */
    let chatMessagesObserver

    // **** REGISTER TRANSCRIPT LISTENER **** //
    // Wait for captions icon to be visible. When user is waiting in meeting lobbing for someone to let them in, the call end icon is visible, but the captions icon is still not visible.
    waitForElement(captionsIconData.selector, captionsIconData.text).then(() => {
      // CRITICAL DOM DEPENDENCY
      const captionsButton = selectElements(captionsIconData.selector, captionsIconData.text)[0]

      // Click captions icon for non manual operation modes. Async operation.
      chrome.storage.sync.get(["operationMode"], function (resultSyncUntyped) {
        const resultSync = /** @type {ResultSync} */ (resultSyncUntyped)
        if (resultSync.operationMode === "manual") {
          console.log("Manual mode selected, leaving transcript off")
        }
        else {
          captionsButton.click()
        }
      })

      // Allow DOM to be updated and then register transcript mutation observer
      waitForElement(`div[role="region"][tabindex="0"]`).then(() => {
        // CRITICAL DOM DEPENDENCY. Grab the transcript element. This element is present, irrespective of captions ON/OFF, so this executes independent of operation mode.
        const transcriptTargetNode = document.querySelector(`div[role="region"][tabindex="0"]`)

        if (transcriptTargetNode) {
          // Create transcript observer instance linked to the callback function. Registered irrespective of operation mode, so that any visible transcript can be picked up during the meeting, independent of the operation mode.
          transcriptObserver = new MutationObserver(transcriptMutationCallback)

          // Start observing the transcript element and chat messages element for configured mutations
          transcriptObserver.observe(transcriptTargetNode, mutationConfig)
        }
        else {
          throw new Error("Transcript element not found in DOM")
        }
      })
        .catch((err) => {
          console.error(err)
          isTranscriptDomErrorCaptured = true
          showNotification(extensionStatusJSON_bug)

          logError("001", err)
        })
    })


    // **** REGISTER CHAT MESSAGES LISTENER **** //
    // Wait for chat icon to be visible. When user is waiting in meeting lobbing for someone to let them in, the call end icon is visible, but the chat icon is still not visible.
    waitForElement(".google-symbols", "chat").then(() => {
      const chatMessagesButton = selectElements(".google-symbols", "chat")[0]
      // Force open chat messages to make the required DOM to appear. Otherwise, the required chatMessages DOM element is not available.
      chatMessagesButton.click()

      // Allow DOM to be updated, close chat messages and then register chatMessage mutation observer
      waitForElement(`div[aria-live="polite"].Ge9Kpc`).then(() => {
        chatMessagesButton.click()
        // CRITICAL DOM DEPENDENCY. Grab the chat messages element. This element is present, irrespective of chat ON/OFF, once it appears for this first time.
        try {
          const chatMessagesTargetNode = document.querySelector(`div[aria-live="polite"].Ge9Kpc`)

          // Create chat messages observer instance linked to the callback function. Registered irrespective of operation mode.
          if (chatMessagesTargetNode) {
            chatMessagesObserver = new MutationObserver(chatMessagesMutationCallback)
            chatMessagesObserver.observe(chatMessagesTargetNode, mutationConfig)
          }
          else {
            throw new Error("Chat messages element not found in DOM")
          }
        } catch (err) {
          console.error(err)
          isChatMessagesDomErrorCaptured = true
          showNotification(extensionStatusJSON_bug)

          logError("002", err)
        }
      })
    })
      .catch((err) => {
        console.error(err)
        isChatMessagesDomErrorCaptured = true
        showNotification(extensionStatusJSON_bug)

        logError("003", err)
      })

    // Show confirmation message from extensionStatusJSON, once observation has started, based on operation mode
    if (!isTranscriptDomErrorCaptured && !isChatMessagesDomErrorCaptured) {
      chrome.storage.sync.get(["operationMode"], function (resultSyncUntyped) {
        const resultSync = /** @type {ResultSync} */ (resultSyncUntyped)
        if (resultSync.operationMode === "manual") {
          showNotification({ status: 400, message: "<strong>MINUTE FLOW is not running</strong> <br /> Turn on captions using the CC icon, if needed" })
        }
        else {
          showNotification(extensionStatusJSON)
        }
      })
    }

    //*********** MEETING END ROUTINES **********//
    try {
      // CRITICAL DOM DEPENDENCY. Event listener to capture meeting end button click by user
      selectElements(meetingEndIconData.selector, meetingEndIconData.text)[0].parentElement.parentElement.addEventListener("click", () => {
        // To suppress further errors
        hasMeetingEnded = true
        if (transcriptObserver) {
          transcriptObserver.disconnect()
        }
        if (chatMessagesObserver) {
          chatMessagesObserver.disconnect()
        }

        // Push any data in the buffer variables to the transcript array, but avoid pushing blank ones. Needed to handle one or more speaking when meeting ends.
        if ((personNameBuffer !== "") && (transcriptTextBuffer !== "")) {
          pushBufferToTranscript()
        }
        stopCaptionBatchTimer(true)
        // Save to chrome storage and send message to download transcript from background script
        overWriteChromeStorage(["transcript", "chatMessages"], true)
      })
    } catch (err) {
      console.error(err)
      showNotification(extensionStatusJSON_bug)

      logError("004", err)
    }
  })
}





//*********** CALLBACK FUNCTIONS **********//
/**
 * @description Callback function to execute when transcription mutations are observed.
 * @param {MutationRecord[]} mutationsList
 */
function transcriptMutationCallback(mutationsList) {
  mutationsList.forEach((mutation) => {
    try {
      if (mutation.type === "characterData") {
        const currentPersonName = mutation.target.parentElement?.previousSibling?.textContent
        const currentTranscriptText = mutation.target.parentElement?.textContent

        if (currentPersonName && currentTranscriptText) {
          // Attempt to dim down the transcript
          mutation.target.parentElement?.parentElement?.setAttribute("style", "opacity:0.2")

          // Starting fresh in a meeting
          if (!transcriptTargetBuffer) {
            transcriptTargetBuffer = mutation.target.parentElement
            personNameBuffer = currentPersonName
            timestampBuffer = new Date().toISOString()
            transcriptTextBuffer = currentTranscriptText
            lastStreamedBufferLength = 0
          }
          // Some prior transcript buffer exists
          else {
            // New transcript UI block
            if (transcriptTargetBuffer !== mutation.target.parentElement) {
              // Push previous transcript block
              pushBufferToTranscript()

              // Update buffers for next mutation and store transcript block timestamp
              transcriptTargetBuffer = mutation.target.parentElement
              personNameBuffer = currentPersonName
              timestampBuffer = new Date().toISOString()
              transcriptTextBuffer = currentTranscriptText
              lastStreamedBufferLength = 0
            }
            // Same transcript UI block being appended
            else {
              // Update buffer for next mutation
              transcriptTextBuffer = currentTranscriptText
            }
          }
        }
      }

      // Logs to indicate that the extension is working
      if (transcriptTextBuffer.length > 125) {
        console.log(transcriptTextBuffer.slice(0, 50) + "   ...   " + transcriptTextBuffer.slice(-50))
      }
      else {
        console.log(transcriptTextBuffer)
      }
    } catch (err) {
      console.error(err)
      if (!isTranscriptDomErrorCaptured && !hasMeetingEnded) {
        
        showNotification(extensionStatusJSON_bug)

        logError("005", err)
      }
      isTranscriptDomErrorCaptured = true
    }
  })
}

/**
 * @description Callback function to execute when chat messages mutations are observed.
 * @param {MutationRecord[]} mutationsList
 */
function chatMessagesMutationCallback(mutationsList) {
  mutationsList.forEach(() => {
    try {
      // CRITICAL DOM DEPENDENCY
      const chatMessagesElement = document.querySelector(`div[aria-live="polite"].Ge9Kpc`)
      // Attempt to parse messages only if at least one message exists
      if (chatMessagesElement && chatMessagesElement.children.length > 0) {
        // CRITICAL DOM DEPENDENCY. Get the last message that was sent/received.
        const chatMessageElement = chatMessagesElement.lastChild?.firstChild?.firstChild?.lastChild
        // CRITICAL DOM DEPENDENCY
        const personAndTimestampElement = chatMessageElement?.firstChild
        const personName = personAndTimestampElement?.childNodes.length === 1 ? userName : personAndTimestampElement?.firstChild?.textContent
        const timestamp = new Date().toISOString()
        // CRITICAL DOM DEPENDENCY
        const chatMessageText = chatMessageElement?.lastChild?.lastChild?.firstChild?.firstChild?.firstChild?.textContent

        if (personName && chatMessageText) {
          /**@type {ChatMessage} */
          const chatMessageBlock = {
            "personName": personName,
            "timestamp": timestamp,
            "chatMessageText": chatMessageText
          }

          // Lot of mutations fire for each message, pick them only once
          pushUniqueChatBlock(chatMessageBlock)
        }
      }
    }
    catch (err) {
      console.error(err)
      if (!isChatMessagesDomErrorCaptured && !hasMeetingEnded) {

        logError("006", err)
      }
      isChatMessagesDomErrorCaptured = true
    }
  })
}










//*********** HELPER FUNCTIONS **********//
/**
 * @description Pushes data in the buffer to transcript array as a transcript block
 */
function pushBufferToTranscript() {
  const transcriptBlock = {
    "personName": personNameBuffer === "You" ? userName : personNameBuffer,
    "timestamp": timestampBuffer,
    "transcriptText": transcriptTextBuffer
  }
  console.log(`[Caption Captured] ${transcriptBlock.personName}: ${transcriptBlock.transcriptText}`)
  transcript.push(transcriptBlock)
  lastStreamedBufferLength = 0
  overWriteChromeStorage(["transcript"], false)
}

/**
 * @description Pushes object to array only if it doesn't already exist.
 * @param {ChatMessage} chatBlock
 */
function pushUniqueChatBlock(chatBlock) {
  const isExisting = chatMessages.some(item =>
    (item.personName === chatBlock.personName) &&
    (chatBlock.chatMessageText === item.chatMessageText)
  )
  if (!isExisting) {
    console.log(chatBlock)
    chatMessages.push(chatBlock)
    overWriteChromeStorage(["chatMessages"], false)
  }
}

function initializeCaptionBatchStreaming() {
  console.log("[Caption Batch] Initializing caption batch streaming...")
  lastStreamedTranscriptIndex = 0
  lastStreamedBufferLength = 0

  chrome.storage.sync.get(["webhookUrl", "webhookBodyType"], function (resultSyncUntyped) {
    const resultSync = /** @type {ResultSync} */ (resultSyncUntyped)
    captionBatchBodyType = resultSync.webhookBodyType === "advanced" ? "advanced" : "simple"

    console.log("[Caption Batch] Webhook URL:", resultSync.webhookUrl || "NOT CONFIGURED")
    console.log("[Caption Batch] Body type:", captionBatchBodyType)

    if (resultSync.webhookUrl) {
      isCaptionBatchStreamingEnabled = true
      console.log("[Caption Batch] Streaming ENABLED - Starting timer")
      startCaptionBatchTimer()
    }
    else {
      isCaptionBatchStreamingEnabled = false
      console.log("[Caption Batch] Streaming DISABLED - No webhook URL configured")
    }
  })
}

function startCaptionBatchTimer() {
  if (!isCaptionBatchStreamingEnabled) {
    console.log("[Caption Batch] Timer NOT started - streaming disabled")
    return
  }

  stopCaptionBatchTimer(false)
  captionBatchTimerId = window.setInterval(() => {
    flushCaptionBatch("interval")
  }, CAPTION_BATCH_INTERVAL_MS)
  console.log(`[Caption Batch] Timer started - will flush every ${CAPTION_BATCH_INTERVAL_MS / 1000} seconds`)
}

/**
 * @param {boolean} flushRemaining
 */
function stopCaptionBatchTimer(flushRemaining) {
  if (captionBatchTimerId) {
    clearInterval(captionBatchTimerId)
    captionBatchTimerId = null
  }

  if (flushRemaining) {
    flushCaptionBatch("shutdown")
  }
}

/**
 * @param {"interval" | "shutdown"} reason
 */
function flushCaptionBatch(reason) {
  if (!isCaptionBatchStreamingEnabled) {
    lastStreamedTranscriptIndex = transcript.length
    lastStreamedBufferLength = transcriptTextBuffer.length
    return
  }

  /** @type {TranscriptBlock[]} */
  const pendingBatch = []

  if (transcript.length > lastStreamedTranscriptIndex) {
    const completedBlocks = transcript.slice(lastStreamedTranscriptIndex).map(block => ({ ...block }))
    pendingBatch.push(...completedBlocks)
  }

  const hasBufferDelta = (transcriptTextBuffer.length > lastStreamedBufferLength) && !!transcriptTargetBuffer
  if (hasBufferDelta) {
    const normalizedPersonName = personNameBuffer === "You" ? userName : personNameBuffer
    const bufferDelta = transcriptTextBuffer.slice(lastStreamedBufferLength)
    if (normalizedPersonName && bufferDelta.trim() !== "") {
      pendingBatch.push({
        personName: normalizedPersonName,
        timestamp: new Date().toISOString(),
        transcriptText: bufferDelta
      })
    }
  }

  if (pendingBatch.length === 0) {
    console.log(`[Caption Batch] No new captions to send (reason: ${reason})`)
    return
  }

  // Log captured captions
  console.log(`[Caption Batch] Sending ${pendingBatch.length} caption(s) (reason: ${reason}):`)
  pendingBatch.forEach((block, index) => {
    console.log(`  ${index + 1}. [${block.personName}] ${block.transcriptText}`)
  })

  const batchStartTimestamp = pendingBatch[0].timestamp
  const batchEndTimestamp = pendingBatch[pendingBatch.length - 1].timestamp

  /** @type {ExtensionMessage} */
  const message = {
    type: "stream_caption_batch",
    captionBatch: pendingBatch,
    metadata: {
      meetingSoftware,
      meetingTitle,
      meetingStartTimestamp,
      batchStartTimestamp,
      batchEndTimestamp,
      reason,
      webhookBodyType: captionBatchBodyType
    }
  }

  chrome.runtime.sendMessage(message, (responseUntyped) => {
    const lastError = chrome.runtime.lastError
    if (lastError) {
      console.error("[Caption Batch] Send failed:", lastError.message)
      return
    }
    const response = /** @type {ExtensionResponse} */ (responseUntyped)
    if (response && response.success) {
      console.log(`[Caption Batch] Successfully sent ${pendingBatch.length} caption(s)`)
      lastStreamedTranscriptIndex = transcript.length
      if (hasBufferDelta) {
        lastStreamedBufferLength = transcriptTextBuffer.length
      }
    }
    else if (response && !response.success && typeof response.message === "object") {
      console.error("[Caption Batch] Send failed:", response.message.errorMessage)
    }
  })
}

/**
 * @description Saves specified variables to chrome storage. Optionally, can send message to background script to download, post saving.
 * @param {Array<"meetingSoftware"  | "meetingTitle" | "meetingStartTimestamp" | "transcript" | "chatMessages">} keys
 * @param {boolean} sendDownloadMessage
 */
function overWriteChromeStorage(keys, sendDownloadMessage) {
  const objectToSave = {}
  // Hard coded list of keys that are accepted
  if (keys.includes("meetingSoftware")) {
    objectToSave.meetingSoftware = meetingSoftware
  }
  if (keys.includes("meetingTitle")) {
    objectToSave.meetingTitle = meetingTitle
  }
  if (keys.includes("meetingStartTimestamp")) {
    objectToSave.meetingStartTimestamp = meetingStartTimestamp
  }
  if (keys.includes("transcript")) {
    objectToSave.transcript = transcript
  }
  if (keys.includes("chatMessages")) {
    objectToSave.chatMessages = chatMessages
  }

  chrome.storage.local.set(objectToSave, function () {
    // Helps people know that the extension is working smoothly in the background
    pulseStatus()
    if (sendDownloadMessage) {
      /** @type {ExtensionMessage} */
      const message = {
        type: "meeting_ended"
      }
      chrome.runtime.sendMessage(message, (responseUntyped) => {
        const response = /** @type {ExtensionResponse} */ (responseUntyped)
        if ((!response.success) && (typeof response.message === 'object') && (response.message?.errorCode === "010")) {
          console.error(response.message.errorMessage)
        }
      })
    }
  })
}

/**
 * @description Provides a visual cue to indicate the extension is actively working.
 */
function pulseStatus() {
  const statusActivityCSS = `position: fixed;
    top: 0px;
    width: 100%;
    height: 4px;
    z-index: 100;
    transition: background-color 0.3s ease-in
  `

  /** @type {HTMLDivElement | null}*/
  let activityStatus = document.querySelector(`#MINUTE FLOW-status`)
  if (!activityStatus) {
    let html = document.querySelector("html")
    activityStatus = document.createElement("div")
    activityStatus.setAttribute("id", "MINUTE FLOW-status")
    activityStatus.style.cssText = `background-color: #2A9ACA; ${statusActivityCSS}`
    html?.appendChild(activityStatus)
  }
  else {
    activityStatus.style.cssText = `background-color: #2A9ACA; ${statusActivityCSS}`
  }

  setTimeout(() => {
    activityStatus.style.cssText = `background-color: transparent; ${statusActivityCSS}`
  }, 3000)
}


/**
 * @description Grabs updated meeting title, if available
 */
function updateMeetingTitle() {
  waitForElement(".u6vdEc").then((element) => {
    const meetingTitleElement = /** @type {HTMLDivElement} */ (element)
    meetingTitleElement?.setAttribute("contenteditable", "true")
    meetingTitleElement.title = "Edit meeting title for MINUTE FLOW"
    meetingTitleElement.style.cssText = `text-decoration: underline white; text-underline-offset: 4px;`

    meetingTitleElement?.addEventListener("input", handleMeetingTitleElementChange)

    // Pick up meeting name after a delay, since Google meet updates meeting name after a delay
    setTimeout(() => {
      handleMeetingTitleElementChange()
      if (location.pathname === `/${meetingTitleElement.innerText}`) {
        showNotification({ status: 200, message: "<b>Give this meeting a title?</b><br/>Edit the underlined text in the bottom left corner" })
      }
    }, 7000)

    function handleMeetingTitleElementChange() {
      meetingTitle = meetingTitleElement.innerText
      overWriteChromeStorage(["meetingTitle"], false)
    }
  })
}

/**
 * @description Returns all elements of the specified selector type and specified textContent. Return array contains the actual element as well as all the parents.
 * @param {string} selector
 * @param {string | RegExp} text
 */
function selectElements(selector, text) {
  var elements = document.querySelectorAll(selector)
  return Array.prototype.filter.call(elements, function (element) {
    return RegExp(text).test(element.textContent)
  })
}

/**
 * @description Efficiently waits until the element of the specified selector and textContent appears in the DOM. Polls only on animation frame change
 * @param {string} selector
 * @param {string | RegExp} [text]
 */
async function waitForElement(selector, text) {
  if (text) {
    // loops for every animation frame change, until the required element is found
    while (!Array.from(document.querySelectorAll(selector)).find(element => element.textContent === text)) {
      await new Promise((resolve) => requestAnimationFrame(resolve))
    }
  }
  else {
    // loops for every animation frame change, until the required element is found
    while (!document.querySelector(selector)) {
      await new Promise((resolve) => requestAnimationFrame(resolve))
    }
  }
  return document.querySelector(selector)
}

/**
 * @description Shows a responsive notification of specified type and message with space theme and typewriter effect
 * @param {ExtensionStatusJSON} extensionStatusJSON
 */
function showNotification(extensionStatusJSON) {
  let html = document.querySelector("html")
  let obj = document.createElement("div")
  let logo = document.createElement("img")
  let text = document.createElement("p")
  let iconWrapper = document.createElement("div")
  let particleCanvas = document.createElement("canvas")
  let statusIndicator = document.createElement("div")

  const notificationId = `minute-flow-notification-${Date.now()}`
  obj.setAttribute("id", notificationId)
  obj.setAttribute("class", "minute-flow-notification")

  logo.setAttribute(
    "src",
    "https://ejnana.github.io/transcripto-status/icon.png"
  )
  logo.setAttribute("height", "45px")
  logo.setAttribute("width", "45px")
  logo.style.cssText = "border-radius: 12px; transition: all 0.4s ease; filter: drop-shadow(0 0 8px rgba(42, 154, 202, 0.6));"

  // Animated icon wrapper with glow
  iconWrapper.style.cssText = "position: relative; display: flex; align-items: center; justify-content: center; z-index: 2;"
  iconWrapper.appendChild(logo)

  // Status indicator pulse
  statusIndicator.style.cssText = `
    position: absolute;
    top: -2px;
    right: -2px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #00ff88;
    box-shadow: 0 0 10px #00ff88, 0 0 20px #00ff88;
    animation: minuteFlowPulse 2s ease-in-out infinite;
    z-index: 3;
  `
  iconWrapper.appendChild(statusIndicator)

  // Canvas for particle effect
  particleCanvas.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    border-radius: 16px;
    z-index: 1;
  `
  particleCanvas.width = 600
  particleCanvas.height = 100

  // Style based on status
  if (extensionStatusJSON.status === 200) {
    obj.style.cssText = `${commonCSS} ${successGradient}`
  }
  else {
    obj.style.cssText = `${commonCSS} ${errorGradient}`
    statusIndicator.style.background = "#ff6b6b"
    statusIndicator.style.boxShadow = "0 0 10px #ff6b6b, 0 0 20px #ff6b6b"
  }

  text.style.cssText = "margin: 0; font-weight: 600; letter-spacing: 0.5px; z-index: 2; position: relative;"

  obj.appendChild(particleCanvas)
  obj.appendChild(iconWrapper)
  obj.appendChild(text)
  
  if (html) {
    html.appendChild(obj)
    
    // Particle animation
    const ctx = particleCanvas.getContext('2d')
    if (ctx) {
      /** @type {Array<{x: number, y: number, vx: number, vy: number, size: number}>} */
      const particles = []
      for (let i = 0; i < 30; i++) {
        particles.push({
          x: Math.random() * 600,
          y: Math.random() * 100,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 2 + 0.5
        })
      }
      
      const context = ctx
      function animateParticles() {
        context.clearRect(0, 0, 600, 100)
        context.fillStyle = extensionStatusJSON.status === 200 ? 'rgba(42, 154, 202, 0.6)' : 'rgba(255, 107, 107, 0.6)'
        
        particles.forEach(p => {
          context.beginPath()
          context.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          context.fill()
          
          p.x += p.vx
          p.y += p.vy
          
          if (p.x < 0 || p.x > 600) p.vx *= -1
          if (p.y < 0 || p.y > 100) p.vy *= -1
        })
        
        if (obj.parentElement) {
          requestAnimationFrame(animateParticles)
        }
      }
      animateParticles()
    }
    
    // Typewriter effect
    const fullMessage = extensionStatusJSON.message
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = fullMessage
    const textContent = tempDiv.textContent || tempDiv.innerText || ''
    
    let charIndex = 0
    text.innerHTML = ''
    
    function typeWriter() {
      if (charIndex < textContent.length) {
        text.innerHTML = fullMessage.substring(0, charIndex + 1)
        charIndex++
        setTimeout(typeWriter, 30)
      }
    }
    
    // Trigger entrance animation
    requestAnimationFrame(() => {
      obj.style.animation = "minuteFlowSpaceEntry 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards"
      setTimeout(typeWriter, 400)
    })

    // Hover effects
    obj.addEventListener("mouseenter", () => {
      logo.style.transform = "scale(1.2) rotate(360deg)"
      logo.style.filter = "drop-shadow(0 0 15px rgba(42, 154, 202, 1))"
      obj.style.transform = "translateY(-4px) scale(1.02)"
      obj.style.boxShadow = "0 25px 70px rgba(0, 0, 0, 0.3), 0 0 60px rgba(42, 154, 202, 0.4), inset 0 0 20px rgba(255, 255, 255, 0.1)"
    })
    
    obj.addEventListener("mouseleave", () => {
      logo.style.transform = "scale(1) rotate(0deg)"
      logo.style.filter = "drop-shadow(0 0 8px rgba(42, 154, 202, 0.6))"
      obj.style.transform = "translateY(0) scale(1)"
      obj.style.boxShadow = "0 15px 50px rgba(0, 0, 0, 0.2), 0 0 40px rgba(42, 154, 202, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.6)"
    })

    // Exit animation
    setTimeout(() => {
      obj.style.animation = "minuteFlowSpaceExit 0.6s cubic-bezier(0.55, 0.085, 0.68, 0.53) forwards"
      setTimeout(() => {
        obj.remove()
      }, 600)
    }, 6000)
  }
}

// Inject keyframe animations into page
if (!document.getElementById('minute-flow-animations')) {
  const styleSheet = document.createElement('style')
  styleSheet.id = 'minute-flow-animations'
  styleSheet.textContent = `
    @keyframes minuteFlowSpaceEntry {
      0% {
        opacity: 0;
        transform: translateY(-50px) scale(0.8) rotateX(20deg);
        filter: blur(10px);
      }
      60% {
        opacity: 1;
        transform: translateY(5px) scale(1.05) rotateX(-5deg);
        filter: blur(0px);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1) rotateX(0deg);
        filter: blur(0px);
      }
    }
    
    @keyframes minuteFlowSpaceExit {
      0% {
        opacity: 1;
        transform: translateY(0) scale(1);
        filter: blur(0px);
      }
      100% {
        opacity: 0;
        transform: translateY(-40px) scale(0.9);
        filter: blur(8px);
      }
    }
    
    @keyframes minuteFlowPulse {
      0%, 100% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(1.3);
        opacity: 0.7;
      }
    }
    
    @keyframes minuteFlowShimmer {
      0% {
        background-position: -1000px 0;
      }
      100% {
        background-position: 1000px 0;
      }
    }
  `
  document.head.appendChild(styleSheet)
}

// CSS for notification with space theme glassmorphism
const commonCSS = `
    background: linear-gradient(135deg, rgba(10, 15, 30, 0.95) 0%, rgba(20, 25, 45, 0.9) 100%);
    backdrop-filter: blur(25px) saturate(200%);
    -webkit-backdrop-filter: blur(25px) saturate(200%);
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    max-width: 550px;
    width: 92%;
    z-index: 999999;
    padding: 1.3rem 1.7rem;
    border-radius: 18px;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    gap: 20px;
    font-size: 1rem;
    line-height: 1.6;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Google Sans", "Space Grotesk", Arial, sans-serif;
    box-shadow: 0 15px 50px rgba(0, 0, 0, 0.2), 0 0 40px rgba(42, 154, 202, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.6);
    border: 1.5px solid rgba(42, 154, 202, 0.3);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: default;
    user-select: none;
    overflow: hidden;
    perspective: 1000px;
`

const successGradient = `
    color: #e0f7ff;
    background: linear-gradient(135deg, rgba(10, 15, 30, 0.95) 0%, rgba(15, 30, 50, 0.92) 50%, rgba(20, 25, 45, 0.9) 100%);
    border-color: rgba(42, 154, 202, 0.5);
`

const errorGradient = `
    color: #ffe0e0;
    background: linear-gradient(135deg, rgba(30, 10, 15, 0.95) 0%, rgba(40, 15, 20, 0.92) 50%, rgba(35, 15, 20, 0.9) 100%);
    border-color: rgba(255, 107, 107, 0.5);
`


/**
 * @description Logs anonymous errors to a Google sheet for swift debugging
 * @param {string} code
 * @param {any} err
 */
function logError(code, err) {
  fetch(`https://script.google.com/macros/s/AKfycbwN-bVkVv3YX4qvrEVwG9oSup0eEd3R22kgKahsQ3bCTzlXfRuaiO7sUVzH9ONfhL4wbA/exec?version=${chrome.runtime.getManifest().version}&code=${code}&error=${encodeURIComponent(err)}&meetingSoftware=${meetingSoftware}`, { mode: "no-cors" })
}


/**
 * @description Attempts to recover last meeting to the best possible extent.
 */
function recoverLastMeeting() {
  return new Promise((resolve, reject) => {
    /** @type {ExtensionMessage} */
    const message = {
      type: "recover_last_meeting",
    }
    chrome.runtime.sendMessage(message, function (responseUntyped) {
      const response = /** @type {ExtensionResponse} */ (responseUntyped)
      if (response.success) {
        resolve("Last meeting recovered successfully or recovery not needed")
      }
      else {
        reject(response.message)
      }
    })
  })
}





// CURRENT GOOGLE MEET TRANSCRIPT DOM. TO BE UPDATED.

{/* <div class="a4cQT kV7vwc eO2Zfd" jscontroller="D1tHje" jsaction="bz0DVc:HWTqGc;E18dRb:lUFH9b;QBUr8:lUFH9b;stc2ve:oh3Xke" style="">
  // CAPTION LANGUAGE SETTINGS. MAY OR MAY NOT HAVE CHILDREN
  <div class="NmXUuc  P9KVBf" jscontroller="rRafu" jsaction="F41Sec:tsH52e;OmFrlf:xfAI6e(zHUIdd)"></div>
  <div class="DtJ7e">
    <span class="frX3lc-vlkzWd  P9KVBf"></span>
    <div jsname="dsyhDe" class="iOzk7 uYs2ee " style="">
      //PERSON 1
      <div class="nMcdL bj4p3b" style="">
        <div class="adE6rb M6cG9d">
          <img alt="" class="Z6byG r6DyN" src="https://lh3.googleusercontent.com/a/some-url" data-iml="63197.699999999255">
            <div class="KcIKyf jxFHg">Person 1</div>
        </div>
        <div jsname="YSxPC" class="bYevke wY1pdd" style="height: 27.5443px;">
          <div jsname="tgaKEf" class="bh44bd VbkSUe">
            Some transcript text.
            Some more text.</div>
        </div>
      </div>
      //PERSON 2
      <div class="nMcdL bj4p3b" style="">
        <div class="adE6rb M6cG9d">
          <img alt="" class="Z6byG r6DyN" src="https://lh3.googleusercontent.com/a/some-url" data-iml="63197.699999999255">
            <div class="KcIKyf jxFHg">Person 2</div>
        </div>
        <div jsname="YSxPC" class="bYevke wY1pdd" style="height: 27.5443px;">
          <div jsname="tgaKEf" class="bh44bd VbkSUe">
            Some transcript text.
            Some more text.</div>
        </div>
      </div>
    </div>
    <div jsname="APQunf" class="iOzk7 uYs2ee" style="display: none;">
    </div>
  </div>
  <div jscontroller="mdnBv" jsaction="stc2ve:MO88xb;QBUr8:KNou4c">
  </div>
</div> */}

// CURRENT GOOGLE MEET CHAT MESSAGES DOM
{/* <div jsname="xySENc" aria-live="polite" jscontroller="Mzzivb" jsaction="nulN2d:XL2g4b;vrPT5c:XL2g4b;k9UrDc:ClCcUe"
  class="Ge9Kpc z38b6">
  <div class="Ss4fHf" jsname="Ypafjf" tabindex="-1" jscontroller="LQRnv"
    jsaction="JIbuQc:sCzVOd(aUCive),T4Iwcd(g21v4c),yyLnsd(iJEnyb),yFT8A(RNMM1e),Cg1Rgf(EZbOH)" style="order: 0;">
    <div class="QTyiie">
      <div class="poVWob">You</div>
      <div jsname="biJjHb" class="MuzmKe">17:00</div>
    </div>
    <div class="beTDc">
      <div class="er6Kjc chmVPb">
        <div class="ptNLrf">
          <div jsname="dTKtvb">
            <div jscontroller="RrV5Ic" jsaction="rcuQ6b:XZyPzc" data-is-tv="false">Hello</div>
          </div>
          <div class="pZBsfc">Hover over a message to pin it<i class="google-material-icons VfPpkd-kBDsod WRc1Nb"
              aria-hidden="true">keep</i></div>
          <div class="MMfG3b"><span tooltip-id="ucc-17"></span><span data-is-tooltip-wrapper="true"><button
                class="VfPpkd-Bz112c-LgbsSe yHy1rc eT1oJ tWDL4c Brnbv pFZkBd" jscontroller="soHxf"
                jsaction="click:cOuCgd; mousedown:UX7yZ; mouseup:lbsD7e; mouseenter:tfO1Yc; mouseleave:JywGue; touchstart:p6p2H; touchmove:FwuNnf; touchend:yfqBxc; touchcancel:JMtRjd; focus:AHmuwe; blur:O22p3e; contextmenu:mg9Pef;mlnRJb:fLiPzd"
                jsname="iJEnyb" data-disable-idom="true" aria-label="Pin message" data-tooltip-enabled="true"
                data-tooltip-id="ucc-17" data-tooltip-x-position="3" data-tooltip-y-position="2" role="button"
                data-message-id="1714476309237">
                <div jsname="s3Eaab" class="VfPpkd-Bz112c-Jh9lGc"></div>
                <div class="VfPpkd-Bz112c-J1Ukfc-LhBDec"></div><i class="google-material-icons VfPpkd-kBDsod VjEpdd"
                  aria-hidden="true">keep</i>
              </button>
              <div class="EY8ABd-OWXEXe-TAWMXe" role="tooltip" aria-hidden="true" id="ucc-17">Pin message</div>
            </span></div>
        </div>
      </div>
    </div>
  </div>
</div> */}