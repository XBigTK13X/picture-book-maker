const { ipcMain } = require('electron')
const spawn = require('child_process').spawn
const settings = require('../common/settings')
const util = require('../common/util')

class IpcServer {
    constructor() {
        this.ipcMain = ipcMain
        this.mpvSocket
        this.mpvProcess
    }

    listen() {
        this.ipcMain.on('pbm-log', async (event, message) => {
            util.serverLog(message)
        })

        process.on('exit', function () {
        })
    }
}

let instance

if (!instance) {
    instance = new IpcServer()
}

module.exports = {
    server: instance,
}
