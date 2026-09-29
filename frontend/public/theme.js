// Day/dark mode, shared by the React app and the Django sign-in pages. Loaded in <head> so the
// saved choice applies before the first paint. With no saved choice the page follows the OS.
(function () {
  var KEY = 'baatcheet-theme'
  var root = document.documentElement
  try {
    var saved = localStorage.getItem(KEY)
    if (saved === 'light' || saved === 'dark') root.dataset.theme = saved
  } catch {}

  window.baatcheetTheme = {
    current: function () {
      return root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    },
    set: function (theme) {
      root.dataset.theme = theme
      try {
        localStorage.setItem(KEY, theme)
      } catch {}
    },
  }
})()
