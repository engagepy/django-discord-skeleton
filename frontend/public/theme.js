// Day/dark mode, shared by the React app and the Django public pages. Loaded in <head> so the saved
// choice applies before the first paint. BaatCheet is dark unless the user picks day mode.
(function () {
  var KEY = 'baatcheet-theme'
  var root = document.documentElement
  try {
    if (localStorage.getItem(KEY) === 'light') root.dataset.theme = 'light'
  } catch {}

  window.baatcheetTheme = {
    current: function () {
      return root.dataset.theme === 'light' ? 'light' : 'dark'
    },
    set: function (theme) {
      if (theme === 'light') root.dataset.theme = 'light'
      else delete root.dataset.theme
      try {
        localStorage.setItem(KEY, theme)
      } catch {}
    },
  }
})()
