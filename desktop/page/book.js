let selectionIndices = []

module.exports = () => {
    return new Promise((resolve, reject) => {
        const path = require('path')
        const util = require('../../common/util')
        const query = util.queryParams()
        const book = require('../data/book')
        const sources = require('../data/sources')
        const settings = require('../../common/settings')
        const workspace = require('../service/workspace')

        const source = sources.getByIndex(query.sourceIndex)

        const RIGHT_CLICK = 2

        workspace.prepDir(query.bookName)
        // Prep the info JSON file
        const bookInfo = book.getInfo(query.sourceIndex, query.bookName)

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
            <button id="toggle-collate-action">Toggle Collage</button>
            <br/>
            <input id="book-category" type="text" class="edit-text" placeholder="Book category" value="${bookInfo.category?bookInfo.category:'Unsorted'}" />
            <button id="book-set-category-action">Set Category</button>
            <button id="browse-action">Browse</button>
            <button id="process-action">Process Book</button>
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

        $('#book-set-category-action').on('click', (jQEvent)=>{
            const textElement = $('#book-category')
            const category = textElement.val()
            if(category && category !== bookInfo.category){
                book.setCategory(query.sourceIndex, query.bookName, category)
            }
        })

        $('#process-action').on('click', (jQEvent)=>{
            require('electron').ipcRenderer.send(
                'pbm-process-book',
                {
                    sourceIndex: query.sourceIndex,
                    bookName: query.bookName
                }
            )
        })

        $('#browse-action').on('click', (jQEvent)=>{
            require('electron').ipcRenderer.send(
                'pbm-browse-location',
                {
                    path: path.join(source, query.bookName)
                },

            )
            require('electron').ipcRenderer.send(
                'pbm-browse-location',
                {
                    path: path.join(workspace.getDirs(query.bookName).root)
                },

            )
        })

        $('#toggle-collate-action').on('click', (jQEvent)=>{
            book.toggleCollate(query.sourceIndex, query.bookName)
        })
        resolve()
    })
}
