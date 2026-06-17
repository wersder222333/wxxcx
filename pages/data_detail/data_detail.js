// pages/data_detail/data_detail.js
const app = getApp();

Page({
  data: {
    isConnected: false,
    updateTime: '',
    cellVoltages: [],
    cell_num:1,
    temperatures: [],
    temp_num:1,
    statistics: {
      maxVoltage: '--',
      minVoltage: '--',
      voltageDiff: '--',
      avgVoltage: '--',
      maxVoltageCell: '--',
      minVoltageCell: '--',
      voltageDiffStatus: '正常',
      maxTemp: '--',
      minTemp: '--',
      maxTempProbe: '--',
      minTempProbe: '--'
    }
  },

  onLoad() {
    this.checkConnection();
  },

  onShow() {
    this.checkConnection();
    this.startDataUpdate();
  },

  onHide() {
    this.stopDataUpdate();
  },

  onUnload() {
    this.stopDataUpdate();
  },

  // 检查连接状态
  checkConnection() {
    this.setData({
      isConnected: app.globalData.isConnected
    });
  },

  // 开始数据更新
  startDataUpdate() {
    this.updateData();
    this.dataTimer = setInterval(() => {
      this.updateData();
    }, 1000);
  },

  // 停止数据更新
  stopDataUpdate() {
    if (this.dataTimer) {
      clearInterval(this.dataTimer);
      this.dataTimer = null;
    }
  },

  // 更新数据
  updateData() {
    // 从全局数据获取
    let cellVoltages = app.globalData.cellData;
    let temperatures = app.globalData.tempData;   
    console.log('[ 详细数据 ] 更新数据','cellVoltages',cellVoltages,'temperatures',temperatures);
    // 如果没有真实数据，使用模拟数据
    // if (!cellVoltages || cellVoltages.length === 0) {
    //   cellVoltages = this.getMockCellData();
    // }
    // if (!temperatures || temperatures.length === 0) {
    //   temperatures = this.getMockTempData();
    // } 
    // 计算统计信息
    const statistics = this.calculateStatistics(cellVoltages, temperatures);
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    this.setData({
      cellVoltages: cellVoltages,
      cell_num:app.globalData.cell_num,
      temperatures: temperatures,
      temp_num:app.globalData.temp_num,
      statistics: statistics,
      updateTime: timeStr
    });
    console.log('[详细数据] 数据更新完成 temperatures=',temperatures);
  },

  // 计算统计数据
  calculateStatistics(cellData, tempData) 
  {
    let result = 
    {
      maxVoltage: '--',
      minVoltage: '--',
      voltageDiff: '--',
      avgVoltage: '--',
      maxVoltageCell: '--',
      minVoltageCell: '--',
      voltageDiffStatus: '正常',
      maxTemp: '--',
      minTemp: '--',
      maxTempProbe: '--',
      minTempProbe: '--'
    };
    if (cellData && cellData.length > 0) 
    {
      const voltages = cellData.map(item => parseFloat(item));
      const maxV = Math.max(...voltages);
      const minV = Math.min(...voltages);
      const avgV = voltages.reduce((a, b) => a + b, 0) / voltages.length;
      const diff = maxV - minV;
      result.maxVoltage = maxV.toFixed(3);
      result.minVoltage = minV.toFixed(3);
      result.avgVoltage = avgV.toFixed(3);
      result.voltageDiff = diff.toFixed(3);
      result.maxVoltageCell = cellData[voltages.indexOf(maxV)].index;
      result.minVoltageCell = cellData[voltages.indexOf(minV)].index;
      // 判断压差状态
      if (diff > 0.3) 
      {
        result.voltageDiffStatus = '异常';
      } 
      else if (diff > 0.15) 
      {
        result.voltageDiffStatus = '偏高';
      } 
      else 
      {
        result.voltageDiffStatus = '正常';
      }
    }  
    if (tempData && tempData.length > 0) 
    {
      const temps = tempData.map(item => parseFloat(item));
      const maxT = Math.max(...temps);
      const minT = Math.min(...temps);
      
      result.maxTemp = maxT.toFixed(1);
      result.minTemp = minT.toFixed(1);
      result.maxTempProbe = tempData[temps.indexOf(maxT)].index;
      result.minTempProbe = tempData[temps.indexOf(minT)].index;
    }  
    return result;
  },

  // 模拟单体电压数据
  getMockCellData() 
  {
    const now = Date.now();
    return Array.from({length: 16}, (_, i) => ({
      index: i + 1,
      value: (3.200 + Math.sin(now / 1000 + i * 0.2) * 0.050).toFixed(3)
    }));
  },

  // 模拟温度数据
  getMockTempData() 
  {
    const now = Date.now();
    return Array.from({length: 6}, (_, i) => ({
      index: i + 1,
      value: (25 + Math.sin(now / 2000 + i * 0.5) * 3).toFixed(1)
    }));
  },

  // 刷新数据
  onRefresh() 
  {
    wx.showLoading({
      title: '刷新中...',
    });
    
    setTimeout(() => {
      this.updateData();
      wx.hideLoading();
      wx.showToast({
        title: '刷新成功',
        icon: 'success'
      });
    }, 500);
  },

  // 电芯点击事件
  onCellClick(e) {
    const { index, cellData } = e.detail;
    wx.showModal({
      title: `单体 #${cellData.index}`,
      content: `电压: ${cellData.value}V`,
      showCancel: false
    });
  }
})