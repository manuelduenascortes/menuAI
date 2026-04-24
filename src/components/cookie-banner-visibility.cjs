function shouldShowCookieBanner(pathname, consent) {
  const isCustomerRoute = pathname?.includes('/mesa/')

  return !isCustomerRoute && consent === null
}

module.exports = {
  shouldShowCookieBanner,
}
