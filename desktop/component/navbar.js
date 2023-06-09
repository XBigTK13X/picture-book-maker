module.exports = {
    render: (options) => {
        options = options || {}
        let navbarContent = `
			<div class="navbar">
		      <a href="landing.html" >
		        <div class="navbar-button">
		          Home
		        </div>
		      </a>
		`
        if (!options.disablePrevious) {
            navbarContent += `
                  <a href="javascript:history.back()">
                    <div class="navbar-button">
                      Previous
                    </div>
                  </a>
            `
        }

        navbarContent += `
        <a href="sources.html">
          <div class="navbar-button">
            Sources
          </div>
        </a>
        `

        navbarContent += `
        <a href="admin.html">
          <div class="navbar-button">
            Admin
          </div>
        </a>
        `


        navbarContent += '</div>'

        const element = document.getElementById('navbar')
        if (!element) {
            throw new Error("Unable to find an element with ID 'navbar'")
        }
        element.innerHTML = navbarContent
    },
}
