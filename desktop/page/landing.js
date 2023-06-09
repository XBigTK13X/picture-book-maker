module.exports = () => {
    return new Promise((resolve, reject) => {
        const util = require('../../common/util')
        const _ = require('lodash')
        const Coordinates = require('../service/image-magick').Coordinates
        const settings = require('../../common/settings')
        let markup = '<img id="current-page" class="scanned-page" src="file://E:/media/book/raw/shopped/CameraSnaps/test/PXL_20230608_143649989.jpg" />'

        let versionMarkup = `<p>v${settings.appVersion} built ${settings.versionDate}</p>`
        if (settings.newVersionAvailable) {
            versionMarkup += `<br/><div class="badge badge-best">New version available, v${settings.newVersion}</div>`
        }
        document.getElementById('version').innerHTML = versionMarkup
        document.getElementById('current-image').innerHTML = markup
        document.getElementById('header').innerHTML = 'Picture Book Maker'

        let currentSelection = []
        let selectionMarkup = ''
        // TODO This will break the display, but not image magick call, on window resize
        const addToSelection = (jQEvent)=>{
            if(currentSelection.length < 4){
                const self = $(jQEvent.target)
                const clickedX = jQEvent.pageX - self.offset().left
                const clickedY = jQEvent.pageY - self.offset().top
                const ratioX = clickedX / self.width()
                const ratioY = clickedY / self.height()
                const targetSize = 5;
                const pointX = jQEvent.pageX - targetSize
                const pointY = jQEvent.pageY - targetSize
                const documentImage = document.getElementById(self.attr("id"))
                currentSelection.push({x: Math.floor(ratioX * documentImage.naturalWidth), y: Math.floor(ratioY * documentImage.naturalHeight)})
                console.log({currentSelection})
                selectionMarkup += `
                    <div style="position: absolute;
                                left: ${pointX}px;
                                top: ${pointY}px;">
                        <img src="../asset/img/target.png"/>
                    </div>
                `
                document.getElementById('selection-points').innerHTML = selectionMarkup
            }
        }

        $('#current-page').on('click', addToSelection)
        $('#crop-button').on('click', (jQEvent)=>{
            const self = $(jQEvent.target)
            const coordinates = new Coordinates()
            coordinates.fromXYPairs(currentSelection)
            require('electron').ipcRenderer.send(
                'pbm-im-distort-and-crop',
                {
                    inputFilePath: 'E:/media/book/raw/shopped/CameraSnaps/test/PXL_20230608_143649989.jpg',
                    selectionCoordinates: coordinates
                }
            )
        })

        resolve()
    })
}
