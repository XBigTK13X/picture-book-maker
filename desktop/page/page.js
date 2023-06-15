const LEFT_CLICK = 0
const MIDDLE_CLICK = 1
const RIGHT_CLICK = 2

const TARGET_WIDTH = 22

const BRACKET_LEFT = 219
const BRACKET_RIGHT = 221

module.exports = () => {
    return new Promise((resolve, reject) => {
        const util = require('../../common/util')
        const _ = require('lodash')
        const settings = require('../../common/settings')
        const query = util.queryParams()
        query.sourceIndex = parseInt(query.sourceIndex, 10)
        const book = require('../data/book')
        const coordinates = require('../service/coordinates')

        let markup = `<img id="current-page" class="scanned-page" src="file://${query.image}" />`

        document.getElementById('current-image').innerHTML = markup
        document.getElementById('header').innerHTML = `${query.bookName} | Page`

        //Without this, the loaded selection points won't display properly since the image width is still 0
        setTimeout(()=>{
            const pages = book.getPages(query.sourceIndex, query.bookName)
            let previousPage = null
            let nextPage = null
            for(let ii = 0; ii < pages.length; ii++){
                const page = pages[ii]
                if(page === query.image){
                    if(ii === 0){
                        previousPage = pages[pages.length - 1]
                    } else {
                        previousPage = pages[ii - 1]
                    }
                    if(ii === pages.length - 1){
                        nextPage = pages[0]
                    }
                    else {
                        nextPage = pages[ii + 1]
                    }
                }
            }
            bookInfo = book.getInfo(query.sourceIndex, query.bookName)
            let selectionMarkup = ''
            let currentSelection = bookInfo.getSelection(query.image) || []
            const imageElement = $('#current-page')
            if(currentSelection.length > 0){
                for(let coord of currentSelection){
                    let translatedCoords = coordinates.elementToWindow(coord.x, coord.y, imageElement)
                    selectionMarkup += `
                    <div style="pointer-events: none;
                                position: absolute;
                                left: ${translatedCoords.window.x - TARGET_WIDTH}px;
                                top: ${translatedCoords.window.y - TARGET_WIDTH}px;
                                opacity: 0.75;">
                        <img src="../asset/img/target.png"/>
                    </div>
                `
                }
                document.getElementById('selection-points').innerHTML = selectionMarkup
            }
            // TODO Resizing will not properly update the selection placement on screen, but the data will be correct
            const clickImage = (jQEvent)=>{
                if(jQEvent.button === LEFT_CLICK){
                    if(currentSelection.length >= 4){
                        currentSelection = []
                        selectionMarkup = ''
                        document.getElementById('selection-points').innerHTML = selectionMarkup
                    }
                    else {
                        const points = coordinates.windowToElement(jQEvent)
                        currentSelection.push({x: points.element.x, y: points.element.y})
                        selectionMarkup += `
                            <div style="pointer-events: none;
                                        position: absolute;
                                        left: ${points.window.x - TARGET_WIDTH}px;
                                        top: ${points.window.y - TARGET_WIDTH}px;
                                        opacity: 0.75;">
                                <img src="../asset/img/target.png"/>
                            </div>
                        `
                        book.setSelection(query.sourceIndex, query.bookName, query.image, currentSelection)
                        document.getElementById('selection-points').innerHTML = selectionMarkup
                    }
                }
                if(jQEvent.button === MIDDLE_CLICK){
                    currentSelection = bookInfo.getSelection(previousPage) || []
                    selectionMarkup = ''
                    if(currentSelection.length > 0){
                        for(let coord of currentSelection){
                            let translatedCoords = coordinates.elementToWindow(coord.x, coord.y, imageElement)
                            selectionMarkup += `
                            <div style="pointer-events: none;
                                        position: absolute;
                                        left: ${translatedCoords.window.x - TARGET_WIDTH}px;
                                        top: ${translatedCoords.window.y - TARGET_WIDTH}px;
                                        opacity: 0.75;">
                                <img src="../asset/img/target.png"/>
                            </div>
                        `
                        }
                        document.getElementById('selection-points').innerHTML = selectionMarkup
                    }
                    book.setSelection(query.sourceIndex, query.bookName, query.image, currentSelection)
                }
                if(jQEvent.button === RIGHT_CLICK){
                    let centerX = 0
                    let centerY = 0
                    for(let coord of currentSelection){
                        centerX += coord.x
                        centerY += coord.y
                    }
                    centerX = centerX / currentSelection.length
                    centerY = centerY / currentSelection.length
                    const points = coordinates.windowToElement(jQEvent)
                    const mouseDeltaX = points.element.x - centerX
                    const mouseDeltaY = points.element.y - centerY
                    let newSelection = []
                    selectionMarkup = ''
                    for(let coord of currentSelection){
                        const points = coordinates.elementToWindow(coord.x + mouseDeltaX, coord.y + mouseDeltaY, imageElement)
                        newSelection.push({
                            x: points.element.x,
                            y: points.element.y
                        })
                        selectionMarkup += `
                        <div style="pointer-events: none;
                                    position: absolute;
                                    left: ${points.window.x - TARGET_WIDTH}px;
                                    top: ${points.window.y - TARGET_WIDTH}px;
                                    opacity: 0.75;">
                            <img src="../asset/img/target.png"/>
                        </div>
                    `
                    }
                    currentSelection = newSelection
                    book.setSelection(query.sourceIndex, query.bookName, query.image, currentSelection)
                    document.getElementById('selection-points').innerHTML = selectionMarkup
                }
            }

            $('#current-page').on('mousedown', clickImage)
            $('#process-button').on('click', (jQEvent)=>{
                require('electron').ipcRenderer.send(
                    'pbm-process-book',
                    {
                        sourceIndex: query.sourceIndex,
                        bookName: query.bookName
                    }
                )
            })
            $('#hide-button').on('click', (jQEvent)=>{
                book.movePages(query.sourceIndex, query.bookName, '.hidden', [query.image])
                window.location.href = `page.html?sourceIndex=${query.sourceIndex}&bookName=${query.bookName}&image=${nextPage}`
            })
            $('#book-button').on('click', (jQEvent)=>{
                window.location.href = `book.html?sourceIndex=${query.sourceIndex}&bookName=${query.bookName}`
            })

            $(document).ready(function(){
                $(this).on('keydown',(jQEvent)=>{
                    if(jQEvent.which === BRACKET_LEFT){
                        window.location.href = `page.html?sourceIndex=${query.sourceIndex}&bookName=${query.bookName}&image=${previousPage}`
                    }
                    if(jQEvent.which === BRACKET_RIGHT){
                        window.location.href = `page.html?sourceIndex=${query.sourceIndex}&bookName=${query.bookName}&image=${nextPage}`
                    }
                })
            })

            resolve()
        },100)
    })
}
