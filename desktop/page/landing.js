module.exports = () => {
    return new Promise((resolve, reject) => {
        const _ = require('lodash')
        const settings = require('../../common/settings')
        const sources = require('../data/sources')
        const books = require('../data/books')

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
        let markup = allBooks.map((book)=>{
            return `
                <a href="book.html?sourceIndex=${book.sourceIndex}&bookName=${book.bookName}">
                <div class="wide-link">
                        ${book.bookName} (${book.sourceDirPath})
                        </div>
                </a>
            `
        }).join('')

        let versionMarkup = `<p>v${settings.appVersion} built ${settings.versionDate}</p>`
        if (settings.newVersionAvailable) {
            versionMarkup += `<br/><div class="badge badge-best">New version available, v${settings.newVersion}</div>`
        }
        document.getElementById('version').innerHTML = versionMarkup
        document.getElementById('content').innerHTML = markup
        document.getElementById('header').innerHTML = `Picture Book Maker (${allBooks.length} books)`

        $('#filter-text').on('keyup', (jQEvent)=>{
            const element = $(jQEvent.target)

            if(element.val().length > 2){
                const needle = element.val().toLowerCase()
                let markup = allBooks.filter(book=>{return book.sortKey.indexOf(needle) !== -1}).map((book)=>{
                    return `
                        <a href="book.html?sourceIndex=${book.sourceIndex}&bookName=${book.bookName}">
                        <div class="wide-link">
                                ${book.bookName} (${book.sourceDirPath})
                                </div>
                        </a>
                    `
                }).join('')
                document.getElementById('content').innerHTML = markup
            } else {
                let markup = allBooks.map((book)=>{
                    return `
                        <a href="book.html?sourceIndex=${book.sourceIndex}&bookName=${book.bookName}">
                        <div class="wide-link">
                                ${book.bookName} (${book.sourceDirPath})
                                </div>
                        </a>
                    `
                }).join('')
                document.getElementById('content').innerHTML = markup
            }
        })

        resolve()
    })
}
