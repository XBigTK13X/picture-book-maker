const { ipcMain } = require('electron')
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

        this.ipcMain.on('pbm-process-book', async (event, options) =>{
            util.serverLog(`Processing [${options.bookName}]`)
            //imageMagick.process(options.inputFilePath,options.selectionCoordinates,options.cropCoordinates)
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
