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

        const reverseIndex = bookInfo.getReverseIndex()

        const renderPages = (selections, twoColMode)=>{
            $('#select-orientation').val(bookInfo.firstPageOrientation).prop('selected', true)
            let showMiddle = false
            if(!!selections){
                selections.sort((a,b)=>{return a - b})
            }
            const somePages = pages.slice(0,settings.maxBookPages)
            let bounded=null
            const markup = somePages.map((page,pageIndex)=>{
                let middle = ''
                    if (!showMiddle && pageIndex >= reverseIndex){
                        showMiddle = true
                        middle = `<img src="../asset/img/middle.png" class="divider">`
                        document.getElementById('header').innerHTML = `Book - ${query.bookName} - ${pages.length} pages - (${pageIndex}|${pages.length-pageIndex})`
                    }
                if(!twoColMode){
                    if(selections.length === 2){
                        bounded = selections[0]<=pageIndex && selections[1]>=pageIndex
                    }
                    return middle + `
                        <a
                            href="page.html?sourceIndex=${query.sourceIndex}&bookName=${query.bookName}&image=${page}"
                            class="page-list-item-wrapper${bounded?' bounded-item':''}"
                            data-page-index="${pageIndex}"
                        >
                            <img data-page-index="${pageIndex}" class="page-list-item scanned-page" src="file://${page}" />
                        <a/>
                    `
                }
                else {
                    let leftIndex = pageIndex + reverseIndex - 1
                    if(bookInfo.collateBackwards){
                        leftIndex = pages.length - pageIndex
                    }
                    if(pageIndex <= 0 || pageIndex >= somePages.length){
                        return ''
                    }
                    if(pageIndex < reverseIndex){
                        return `
                        <a
                            href="page.html?sourceIndex=${query.sourceIndex}&bookName=${query.bookName}&image=${somePages[leftIndex]}"
                            class="page-list-item-wrapper${bounded?' bounded-item':''}"
                            data-page-index="${leftIndex}"
                        >
                            <img data-page-index="${leftIndex}" class="page-list-item-big scanned-page" src="file://${somePages[leftIndex]}" />
                        <a/>
                        <a
                            href="page.html?sourceIndex=${query.sourceIndex}&bookName=${query.bookName}&image=${page}"
                            class="page-list-item-wrapper${bounded?' bounded-item':''}"
                            data-page-index="${pageIndex}"
                        >
                            <img data-page-index="${pageIndex}" class="page-list-item-big scanned-page" src="file://${page}" />
                        <a/>
                        <br/>
                        `
                    }
                }
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
            <button id="overview-action">Overview</button>
            <br/>
            <input id="book-category" type="text" class="edit-text" placeholder="Book category" value="${bookInfo.category?bookInfo.category:'Unsorted'}" />
            <button id="book-set-category-action">Set Category</button>
            <button id="browse-action">Browse</button>
            <button id="two-col-action">Two Columns</button>
            <button id="process-action">Process Book</button>
            <br/>
           [<input id="check-collate-backwards" name="check-collate-backwards" type="checkbox"${bookInfo.collateBackwards ? ' checked' : '' }/>
            <label for="check-collate-backwards">Collate Backwards</label>]
            [<input id="check-sequential-stitching" name="check-sequential-stitching" type="checkbox"${bookInfo.sequentialStitching ? ' checked' : ''}/>
            <label for="check-sequential-stitching">Sequential Stitching</label>]
            [<input id="check-skip-stitching" name="check-skip-stitching" type="checkbox"${bookInfo.skipStitching ? ' checked' : ''}/>
            <label for="check-skip-stitching">Skip Stitching</label>]
            [<input id="check-single-rotation" name="check-single-rotation" type="checkbox"${bookInfo.singleRotation ? ' checked' : ''}/>
            <label for="check-single-rotation">Single Rotation</label>]
            [Orientation
            <select id="select-orientation">
                <option value="up">up</option>
                <option value="right">right</option>
                <option value="down">down</option>
                <option value="left">left</option>
            </select>
            ]
        `

        document.getElementById('book-controls').innerHTML = controlMarkup
        renderPages([])

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
                bookInfo.category = category
            }
        })

        $('#process-action').on('click', (jQEvent)=>{
            const textElement = $('#book-category')
            const category = textElement.val()
            if(!category || category === 'Unsorted' || !bookInfo.category || bookInfo.category === 'Unsorted'){
                require('electron').ipcRenderer.send(
                    'pbm-alert-no-category'
                )
            } else {
                require('electron').ipcRenderer.send(
                    'pbm-process-book',
                    {
                        sourceIndex: query.sourceIndex,
                        bookName: query.bookName
                    }
                )
            }
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

        $('#two-col-action').on('click', (jQEvent)=>{
            renderPages(selectionIndices, 'two-col')
        })

        $('#overview-action').on('click', (jQEvent)=>{
            renderPages(selectionIndices)
        })

        $('#check-collate-backwards').on('change', (jQEvent)=>{
            book.toggleCollate(query.sourceIndex, query.bookName)
            bookInfo.collateBackwards = !bookInfo.collateBackwards
        })

        $('#check-single-rotation').on('change', (jQEvent)=>{
            book.toggleSingleRotation(query.sourceIndex, query.bookName)
            bookInfo.singleRotation = !bookInfo.singleRotation
        })
        $('#check-skip-stitching').on('change', (jQEvent)=>{
            book.toggleSkipStitching(query.sourceIndex, query.bookName)
            bookInfo.skipStitching = !bookInfo.skipStitching
        })
        $('#check-sequential-stitching').on('change', (jQEvent)=>{
            book.toggleSequentialStitching(query.sourceIndex, query.bookName)
            bookInfo.sequentialStitching = !bookInfo.sequentialStitching
        })
        $('#select-orientation').on('change', (jQEvent)=>{
            const element = $(jQEvent.target)
            const orientation = element.val()
            book.setFirstPageOrientation(query.sourceIndex, query.bookName, orientation)
            bookInfo.firstPageOrientation = orientation
        })
        resolve()
    })
}
