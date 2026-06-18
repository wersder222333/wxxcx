// app.js
App({
  globalData: {
    // 蓝牙连接状态
    deviceId: null,
    deviceName: '',
    isConnected: false,
    // 电池实时数据（由 ble_scan 页面更新）
    batteryData: {
      voltage: 0,
      current: 0,
      power: 0,
      soc: 0,
      capacity: 0,
      cycleCount: 0,
      status: '未知'
    },
    // 单体电压数据
    cellData: [],
    //单体数量
    cell_num:0,
    // 温度数据
    tempData: [],
    //温度探头数量
    temp_num:0,
    // 数据更新时间戳
    lastUpdateTime: '',
    devices: [],
  }
})
