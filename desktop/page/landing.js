module.exports = () => {
    return new Promise((resolve, reject) => {
        const util = require('../../common/util')
        const settings = require('../../common/settings')
        let markup = '<img id="current-page" class="scanned-page" src="file://E:/media/book/raw/shopped/CameraSnaps/snaps/PXL_20230608_143649989.jpg" />'

        let versionMarkup = `<p>v${settings.appVersion} built ${settings.versionDate}</p>`
        if (settings.newVersionAvailable) {
            versionMarkup += `<br/><div class="badge badge-best">New version available, v${settings.newVersion}</div>`
        }
        document.getElementById('version').innerHTML = versionMarkup
        document.getElementById('menu-entries').innerHTML = markup
        document.getElementById('header').innerHTML = 'Picture Book Maker'

        // TODO https://stackoverflow.com/questions/50149907/imagemagick-skew-image-with-4-x-y-coordinates

        $(document).ready(function() {
            $('#current-page').click(function(e) {
                const self = $(this)
                var offset = self.offset();
                var size = {
                    width: self.width(),
                    height: self.height()
                }
              console.log({x: e.pageX - offset.left, y: e.pageY - offset.top, size});
            });
          });

        resolve()
    })
}
