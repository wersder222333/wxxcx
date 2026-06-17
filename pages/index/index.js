
Page({
  data: {
  },
  gotoBLEScan() {
    wx.navigateTo({
      url: '/pages/ble_scan/ble_scan'
    });
  },
  gotoDataOverview() {
    wx.navigateTo({
      url: '/pages/data_overview/data_overview'
    });
  },
  gotoDataDetail() {
    wx.navigateTo({
      url: '/pages/data_detail/data_detail'
    });
  },
})
