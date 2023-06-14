let selectionIndices = []

module.exports = () => {
    return new Promise((resolve, reject) => {
        const util = require('../../common/util')
        const query = util.queryParams()
        const book = require('../data/book')
        const settings = require('../../common/settings')
        const workspace = require('../service/workspace')

        const RIGHT_CLICK = 2

        workspace.prepDir(query.bookName)
        // Prep the info JSON file
        book.getInfo(query.sourceIndex, query.bookName)

        const pages = book.getPages(query.sourceIndex, query.bookName)

        const renderPages = (selections)=>{
            if(!!selections){
                selections.sort((a,b)=>{return a - b})
            }
            const markup = pages.slice(0,settings.maxBookPages).map((page,pageIndex)=>{
                let bounded=null
                if(selections.length === 2){
                    bounded = selections[0]<=pageIndex && selections[1]>=pageIndex
                }
                return `
                    <a
                        href="page.html?sourceIndex=${query.sourceIndex}&bookName=${query.bookName}&image=${page}"
                        class="page-list-item-wrapper${bounded?' bounded-item':''}"
                        data-page-index="${pageIndex}"
                    >
                        <img data-page-index="${pageIndex}" class="page-list-item scanned-page" src="file://${page}" />
                    <a/>
                `
            }).join('')

            document.getElementById('pages-list').innerHTML = markup

            $('.page-list-item-wrapper').on('mousedown', (jQEvent)=>{
                const element = $(jQEvent.target)
                if(jQEvent.button === RIGHT_CLICK){
                    const pageIndex = parseInt(element.attr("data-page-index"), 10)
                    if(selectionIndices.length < 2){
                        selectionIndices.push(pageIndex)
                        if(selectionIndices.length === 2){
                            renderPages(selectionIndices)
                        }
                    }
                    else {
                        selectionIndices = [
                            pageIndex
                        ]
                    }
                }
            })
        }

        const controlMarkup = `
            <input id="book-move-target" type="text" class="edit-text" placeholder="New book name" value="${query.bookName}" />
            <button id="book-move-action">Move Selection</button>
            <button id="book-rename-action">Rename Book</button>
        `

        renderPages([])
        document.getElementById('book-controls').innerHTML = controlMarkup
        document.getElementById('header').innerHTML = `Book - ${query.bookName} - ${pages.length} pages`

        $('#book-move-action').on('click', (jQEvent)=>{
            const textElement = $('#book-move-target')
            const newBookName = textElement.val()
            if(newBookName && newBookName !== query.bookName){
                const params = {
                    sourceIndex: query.sourceIndex,
                    bookName: newBookName
                }
                const sourcePages = pages.slice(selectionIndices[0], selectionIndices[1] + 1)
                book.movePages(query.sourceIndex, query.bookName, newBookName, sourcePages)
                window.location.href = "book.html?"+util.queryString(params)
            }
        })

        $('#book-rename-action').on('click', (jQEvent)=>{
            const textElement = $('#book-move-target')
            const newBookName = textElement.val()
            if(newBookName && newBookName !== query.bookName){
                const params = {
                    sourceIndex: query.sourceIndex,
                    bookName: newBookName
                }
                book.movePages(query.sourceIndex, query.bookName, newBookName, pages)
                window.location.href = "book.html?"+util.queryString(params)
            }
        })

        resolve()
    })
}
