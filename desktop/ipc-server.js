const { ipcMain } = require('electron')
const util = require('../common/util')
const bookMaker = require('./service/book-maker')
const book = require('./data/book')
const sources = require('./data/sources')
const books = require('./data/books')
const workspace = require('./service/workspace')
const _ = require("lodash")
const fs = require('fs')
const path = require('path')

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
            const start = Date.now();
            const bookInfo = book.getInfo(options.sourceIndex, options.bookName)
            workspace.prepDir(options.bookName)
            const workDirs = workspace.getDirs(options.bookName)
            util.serverLog(`Extracting [${options.bookName}]`)
            return bookMaker.extract(bookInfo, workDirs)
            .then((bookInfo)=>{
                util.serverLog(`Stitching [${options.bookName}]`)
                return bookMaker.stitch(bookInfo, workDirs)
            })
            .then((bookInfo)=>{
                util.serverLog(`Archiving [${options.bookName}]`)
                return bookMaker.archive(bookInfo, workDirs)
            })
            .then(()=>{
                util.serverLog(`Finished [${options.bookName}]`)
                const end = Date.now();
                util.serverLog(`Execution time: ${((end - start)/1000)} seconds`);
            })
        })

        this.ipcMain.on('pbm-regenerate-archives', async (event, options) =>{
            util.serverLog(`Regenerating all book archives`)
            let allBooks = _.flatten(
                sources.getList().map((directoryPath, sourceIndex)=>{
                    const bookList = books.getList(sourceIndex)
                    return bookList.map((bookName)=>{
                        return {
                            sourceIndex,
                            bookName,
                            sourceDirPath: directoryPath,
                            sortKey: bookName.toLowerCase()
                        }
                    })
                })
            )
            allBooks.sort((a,b)=>{return a.sortKey < b.sortKey ? -1 : 1})
            let archivePromises = allBooks.map((bookSourceInfo, mapIndex)=>{
                const bookInfo = book.getInfo(bookSourceInfo.sourceIndex, bookSourceInfo.bookName)
                const workDirs = workspace.getDirs(bookSourceInfo.bookName)
                if(bookSourceInfo.bookName === '.hidden' || !fs.existsSync(path.join(workDirs.export, bookSourceInfo.bookName + ".cbz"))){
                    return ()=>{
                        return {
                            promise: Promise.resolve(),
                            message: `(${mapIndex}/${allBooks.length}) Skipping regenerate for ${bookSourceInfo.bookName}`
                        }
                    }
                }
                return ()=>{return {
                    promise: bookMaker.archive(bookInfo, workDirs),
                    message: `(${mapIndex}/${allBooks.length}) Regenerate archive for ${bookSourceInfo.bookName}`
                }}
            })
            await util.serialBatchPromises(archivePromises, 1)
            util.serverLog("Finished regenerating archives")
        })

        this.ipcMain.on('pbm-browse-location', async (event, options)=>{
            util.serverLog(`Opening [${options.path}] in explorer`)
            require('electron').shell.openPath(options.path);
        })

        this.ipcMain.on('pbm-alert-no-category', async (event, options)=>{
            require('electron').dialog.showErrorBox('Unable to process book.', 'A category must be set.')
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
