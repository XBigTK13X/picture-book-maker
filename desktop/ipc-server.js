const { ipcMain } = require('electron')
const util = require('../common/util')
const bookMaker = require('./service/book-maker')
const book = require('./data/book')
const workspace = require('./service/workspace')

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
            const bookInfo = book.getInfo(options.sourceIndex, options.bookName)
            workspace.clean(options.bookName)
            const workDirs = workspace.getDirs(options.bookName)
            util.serverLog(`Extracting [${options.bookName}]`)
            return bookMaker.extract(bookInfo, workDirs)
            .then(()=>{
                util.serverLog(`Stitching [${options.bookName}]`)
                return bookMaker.stitch(bookInfo, workDirs)
            })
            .then(()=>{
                util.serverLog(`Archiving [${options.bookName}]`)
                return bookMaker.archive(bookInfo, workDirs)
            })
            .then(()=>{
                util.serverLog(`Finished [${options.bookName}]`)
            })
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
