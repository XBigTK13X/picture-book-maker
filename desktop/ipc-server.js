const { ipcMain } = require('electron')
const spawn = require('child_process').spawn
const settings = require('../common/settings')
const util = require('../common/util')
const imageMagick = require('./service/image-magick')

class IpcServer {
    constructor() {
        this.ipcMain = ipcMain
    }

    listen() {
        this.ipcMain.on('pbm-log', async (event, message) => {
            util.serverLog(message)
        })

        this.ipcMain.on('pbm-im-distort-and-crop', async (event, options) =>{
            util.serverLog(`Crop and distort [${options.inputFilePath}]`)
            imageMagick.distortAndCrop(options.inputFilePath,options.selectionCoordinates,options.cropCoordinates)
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
