module.exports = () => {
    return new Promise((resolve, reject) => {
        const util = require('../../common/util')
        const _ = require('lodash')
        const Coordinates = require('../service/image-magick').Coordinates
        const settings = require('../../common/settings')
        let markup = '<a href="page.html?sourceIndex=1&bookName=Excavator%27s%20123%20-%20Sherri%20Rinker&image=E:\\media\\book\\raw\\shopped\\CameraSnaps\\test\\Excavator%27s%20123%20-%20Sherri%20Rinker\\PXL_20230608_143649989.jpg">Debug Page</a>'

        let versionMarkup = `<p>v${settings.appVersion} built ${settings.versionDate}</p>`
        if (settings.newVersionAvailable) {
            versionMarkup += `<br/><div class="badge badge-best">New version available, v${settings.newVersion}</div>`
        }
        document.getElementById('version').innerHTML = versionMarkup
        document.getElementById('content').innerHTML = markup
        document.getElementById('header').innerHTML = 'Picture Book Maker'

        resolve()
    })
}
