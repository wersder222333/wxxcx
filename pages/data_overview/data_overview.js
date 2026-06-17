// pages/data_overview/data_overview.js
const app = getApp();

Page({
  data: {
    isConnected: false,
    batteryPercent: 0,
    packData: {
      voltage: 0,
      current: 0,
      power: 0,
      capacity: 0,
      cycleCount: 0,
      status: '未知',
      statusColor: 'normal'
    },
    updateTime: ''
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
    const isConnected = app.globalData.isConnected;
    this.setData({
      isConnected: isConnected
    });

    if (!isConnected) {
      wx.showModal({
        title: '未连接设备',
        content: '请先连接蓝牙设备',
        confirmText: '去连接',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.navigateBack();
          }
        }
      });
    }
  },

  // 开始数据更新
  startDataUpdate() {
    // 立即更新一次
    this.updateData();
    
    // 每秒更新一次
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
  updateData() 
  {
    // 从全局数据获取电池数据
    const batteryData = app.globalData.batteryData;
    console.log('[ 更新数据概览 ] batteryData=',batteryData);
    // 模拟数据（实际使用时注释掉）
    // const mockData = this.getMockData();
    
    // 使用真实数据或模拟数据
    const data = batteryData;
    
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    // 计算功率
    const power = (data.voltage * Math.abs(data.current)).toFixed(1);
    
    // 判断状态
    let status = '正常';
    let statusColor = 'normal';
    if (data.current > 1) {
      status = '放电中';
      statusColor = 'warning';
    } else if (data.current < -1) {
      status = '充电中';
      statusColor = 'normal';
    } else {
      status = '待机';
      statusColor = 'normal';
    }
    
    this.setData({
      batteryPercent: data.soc || 0,
      packData: {
        voltage: data.voltage.toFixed(2),
        current: data.current.toFixed(2),
        power: power,
        capacity: data.capacity || '--',
        cycleCount: data.cycleCount || '--',
        status: status,
        statusColor: statusColor
      },
      updateTime: timeStr
    });

    // 更新全局数据中的详细数据
    if (data.cellVoltages) {
      app.globalData.cellData = data.cellVoltages;
    }
    if (data.temperatures) {
      app.globalData.tempData = data.temperatures;
    }
  },

  // 模拟数据（开发测试用）
  getMockData() {
    const now = Date.now();
    const baseVoltage = 48.0 + Math.sin(now / 1000) * 0.5;
    const baseCurrent = 5 + Math.sin(now / 2000) * 3;
    
    return {
      voltage: baseVoltage,
      current: baseCurrent,
      soc: Math.round(50 + Math.sin(now / 5000) * 30),
      capacity: 100,
      cycleCount: 156,
      cellVoltages: Array.from({length: 16}, (_, i) => ({
        index: i + 1,
        value: (3200 + Math.sin(now / 1000 + i * 0.1) * 50).toFixed(0)
      })),
      temperatures: Array.from({length: 6}, (_, i) => ({
        index: i + 1,
        value: (25 + Math.sin(now / 2000 + i * 0.5) * 3).toFixed(1)
      }))
    };
  },

  // 充电操作
  onCharge() {
    if (!this.data.isConnected) {
      wx.showToast({
        title: '请先连接设备',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({
      title: '正在充电...',
    });
    
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '充电已开启',
        icon: 'success'
      });
    }, 1000);
  },

  // 放电操作
  onDischarge() {
    if (!this.data.isConnected) {
      wx.showToast({
        title: '请先连接设备',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({
      title: '正在放电...',
    });
    
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '放电已开启',
        icon: 'success'
      });
    }, 1000);
  },

  // 进度条变化处理
  handlePercentChange(e) {
    console.log('电池百分比:', e.detail.percent);
  }
})