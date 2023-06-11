const { DateTime } = require('luxon')
const path = require('path')
const fs = require('fs')
const settings = require('../common/settings')
let logFile = null

const browserGetMediaProfiles = () => {
    return require('electron').ipcRenderer.sendSync('pbm-get-media-profiles')
}

const isClass = (target) => {
    try {
        new target()
    } catch (err) {
        return false
    }
    return true
}

let tippyInstances = []

const loadTooltips = () => {
    for (let instance of tippyInstances) {
        instance.destroy()
    }
    const tippy = require('tippy.js').default
    tippyInstances = tippy('[data-tippy-content]', {
        placement: 'auto',
        delay: 300,
        allowHTML: true,
        theme: 'pbm',
        maxWidth: 'none',
    })
}

let lastLocation = ''
let lastParams = {}
const queryParams = (target) => {
    if (typeof window !== 'undefined') {
        target = window.location.search
    }
    if (lastLocation === target) {
        return { ...lastParams }
    }
    lastLocation = target
    lastParams = require('query-string').parse(target)
    return lastParams
}

const queryString = (target) => {
    return require('query-string').stringify(target)
}

const getCaller = () => {
    // get the top most caller of the function stack for error message purposes
    const stackMatch = new Error().stack.match(/at\s\w*[^getCaller]\.\w*\s/g)
    const caller = stackMatch[stackMatch.length - 1].split('.')[1].trim() + '()'
    return caller
}

const serverLog = (message) => {
    if (!logFile) {
        logFile = settings.desktopPath('logs/pbm-ipc.log')
        // Clear the log each launch
        console.log('')
        fs.writeFileSync(logFile, '')
    }
    let stampedMessage = DateTime.local().toRFC2822() + ' - ' + message
    console.log(stampedMessage)
    fs.appendFile(logFile, stampedMessage + '\n', (err) => {
        if (err) {
            console.log({ err })
        }
    })
}

const clientLog = (message) => {
    try {
        console.log(message)
        const electron = require('electron')
        if (electron.ipcRenderer) {
            electron.ipcRenderer.send('pbm-log', message)
        }
    } catch (err) {
        console.log('Swallowing an error that occurred while sending a client log', { err })
    }
}

const getFiles = (root) => {
    const dirs = fs.readdirSync(root, { withFileTypes: true });
    return dirs.reduce((acc, file) => {
        const filePath = path.join(root, file.name);
        return acc.concat(
            file.isDirectory() ? getFiles(filePath) : filePath
        );
    }, []);
}

const delay = (handler) => {
    setTimeout(handler, 0)
}

let windowStorage = {}
let windowStub = {
    localStorage: {
        getItem: (key) => {
            if (!windowStorage.hasOwnProperty(key)) {
                return null
            }
            return windowStorage[key]
        },
        setItem: (key, val) => {
            windowStorage[key] = val
        },
        clear: () => {
            windowStorage = {}
        },
        removeItem: (key) => {
            delete windowStorage[key]
        },
    },
    loadingStart: (message) => {},
    loadingStop: () => {},
}

if (typeof window !== 'undefined') {
    windowStub = window
}

module.exports = {
    browserGetMediaProfiles,
    clientLog,
    delay,
    getCaller,
    getFiles,
    isClass,
    loadTooltips,
    queryParams,
    queryString,
    serverLog,
    window: windowStub,
}
