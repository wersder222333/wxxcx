// pages/ble_scan/ble_scan.js
import BluetoothManager from '../../utils/BluetoothManager.js'
import Data_analysis from '../../utils/Data_analysis.js'
const app = getApp();
const bluetoothManager = new BluetoothManager();
// 命令队列定义在 Page 外部
const COMMAND_QUEUE = [
  { 
    name: '实时数据', 
    frame: [0x01, 0x04, 0x31, 0x00, 0x00, 0x2E, 0x7E, 0xEA], 
    timeout: 3000 
  },
  { 
    name: '实时状态', 
    frame: [0x01, 0x04, 0x32, 0x00, 0x00, 0x0B, 0xBF, 0x75], 
    timeout: 3000 
  },
  { 
    name: '序列号', 
    frame: [0x01, 0x04, 0x94, 0x00, 0x00, 0x0F, 0x9C, 0x3E], 
    timeout: 3000 
  }
];
Page({
  data: {

    deviceCount: 0,
    isScanning: false,
    isConnected: false,
    connectedDeviceName: '',
    connectedDeviceId: '',
    adapterReady: false,  // 新增：标记适配器是否就绪
   
  },
  // 查询命令队列（按文档建议依次查询）
  commandQueue: COMMAND_QUEUE,
  // 存储解析后的数据
  realTimeData: null,
  statusData: null,
  serialNumber: null,
  onLoad() {
    // 保存 this 引用到 that，解决所有异步回调中的 this 指向问题
    const that = this;
    // 注册蓝牙事件回调
    this.registerBluetoothEvents();
    
    // 初始化蓝牙适配器
    bluetoothManager.initAdapter()
      .then(() => {
        console.log('蓝牙适配器初始化成功');
        this.setData({ 
          adapterReady: true 
        });
      })
      .catch(err => {
        console.error('蓝牙适配器初始化失败', err);
        wx.showModal({
          title: '提示',
          content: '请开启蓝牙功能',
          showCancel: false,
          success: () => {
            wx.openSetting();
          }
        });
      });
  },

  onShow() {
    this.setData({
        isConnected:app.globalData.isConnected
    });
     // 每次页面显示时刷新设备列表
     this.loadDeviceList();
    // 自动开始扫描
    if (!this.data.isScanning && this.data.adapterReady) {
      // this.startScan();
    }
  },

  onHide() {
    // this.stopScan();
  },

  onUnload() {
    // this.stopScan();
    // 注意：不要关闭蓝牙适配器，因为其他页面可能还在使用
  },

  // 注册蓝牙事件回调
  registerBluetoothEvents() {
    // ✅ 在每个函数内部重新定义 that
    const that = this;
    // 当发现新的蓝牙设备后，更新设备列表
    bluetoothManager.on('onDeviceFound', (devices) => {
      this.addDevices(devices);
    });

    // 连接设备成功回调
    bluetoothManager.on('onConnected', (deviceId, name) => {
      console.log('连接成功回调, name:', name);
      // ✅ 确保 name 有值，如果为 undefined 则使用空字符串
      const deviceName = name || '';
      const targetId = deviceId || '';
      this.setData({
        isConnected: true,
        connectedDeviceName: name,
        connectedDeviceId: deviceId
      });
      // 更新设备列表中对应设备的连接状态
      const devices = this.data.devices.map(device => {
        if (device.deviceId === deviceId) {
          device.connected = true;
        }
        return device;
      });
      this.setData({ devices });
      wx.showToast({ title: '连接成功' });
     // 连接成功后启动数据查询
     wx.nextTick(() => {
      that.startDataQuery();
    });
      // 保存到全局数据
      app.globalData.deviceId = deviceId;
      app.globalData.deviceName = name;
      app.globalData.isConnected = true;
      // 跳转到数据概览页面
      setTimeout(() => {
        wx.navigateTo({
          url: '/pages/data_overview/data_overview'
        });
      }, 500);
    });

    // 断开设备回调
    bluetoothManager.on('onDisconnected', () => {
      this.setData({
        isConnected: false,
        connectedDeviceName: '',
        connectedDeviceId: ''
      });

      // 更新所有设备的连接状态
      const devices = this.data.devices.map(device => {
        device.connected = false;
        return device;
      });
      this.setData({ devices });

      // 更新全局连接状态
      app.globalData.isConnected = false;
      
      wx.showToast({ title: '设备已断开', icon: 'none' });
    });

    // 接收数据回调
    bluetoothManager.on('onDataReceived', (received) => {
      console.log('[蓝牙扫描界面 - 收到蓝牙数据]', received.hexStr); // 使用 hexStr 显示日志
      
      // 使用 Data_analysis 解析数据
      const parsedData = Data_analysis.parseRealTimeData(received.value);
      
      if (parsedData) {
        // 更新全局数据
        app.globalData.batteryData = {
          voltage: parsedData.voltage || 0,
          current: parsedData.current || 0,
          power: parsedData.power || 0,
          soc: parsedData.soc || 0,
          capacity: parsedData.capacity || 0,
          cycleCount: parsedData.cycleCount || 0,
          status: parsedData.status || '正常'
        };
        
        // 更新单体电压和温度数据
        if (parsedData.cellVoltages) {
          app.globalData.cellData = parsedData.cellVoltages;
        }
        app.globalData.cell_num = parsedData.cellCount;
        if (parsedData.temperatures) {
          app.globalData.tempData = parsedData.temperatures;
        }
        app.globalData.temp_num = parsedData.probeCount;
        // 更新时间戳
        app.globalData.lastUpdateTime = new Date().toLocaleTimeString();
        
        console.log('全局数据已更新:', app.globalData.batteryData);
      }
    });
  },
// ---------- 数据查询核心逻辑 ----------
  /**
   * 启动数据查询（循环发送命令）
   */
  startDataQuery() {
    if (this.data.isQuerying) {
      console.log('数据查询已在运行中');
      return;
    }
    
    console.log('启动数据查询');
    // 保存 this 引用
  const that = this;
    this.setData({ isQuerying: true });
    
    // 初始化状态
    this.currentCommandIndex = 0;
    this.responseReceived = {};
    
    // 立即发送第一条命令
    that.sendNextCommand();
    
    // 每隔1.5秒发送下一条命令（比原版1秒稍长，避免冲突）
    this.sendInterval = setInterval(() => {
      that.sendNextCommand();
    }, 1500);
  },

  /**
   * 发送下一条查询命令
   */
  sendNextCommand() {
    if (this.currentCommandIndex >= this.commandQueue.length) {
      this.currentCommandIndex = 0; // 循环查询
    }
    
    const command = this.commandQueue[this.currentCommandIndex];
    
    // 发送命令到蓝牙设备
    this.sendCommand(command.frame);
    
    // 更新当前命令显示
    this.setData({ 
      currentCommandName: command.name 
    });
    
    console.log(`[查询] 发送命令: ${command.name}`, command.frame);
    
    // 设置响应超时检测
    this.setupCommandTimeout(command.name, command.timeout);
    
    this.currentCommandIndex++;
  },

  /**
   * 发送命令到蓝牙设备
   */
  sendCommand(frame) {
    // 将十六进制数组转换为 ArrayBuffer
    const buffer = new ArrayBuffer(frame.length);
    const dataView = new Uint8Array(buffer);
    frame.forEach((byte, index) => {
      dataView[index] = byte;
    });
    
    // 调用 BluetoothManager 发送数据
    bluetoothManager.writeData(buffer)
      .then(() => {
        console.log('命令发送成功');
      })
      .catch(err => {
        console.error('命令发送失败', err);
      });
  },

  /**
   * 设置命令超时检测
   */
  setupCommandTimeout(commandName, timeout) 
  {
    const that = this;
    // 清除之前的超时定时器
    if (this.commandTimeout) 
    {
      clearTimeout(this.commandTimeout);
    }
    // 标记该命令尚未收到响应
    this.responseReceived[commandName] = false;
    // 设置超时
    this.commandTimeout = setTimeout(() => {
      if (!that.responseReceived[commandName]) {
        console.warn(`[超时] 命令 ${commandName} 未收到响应`);
      }
    }, timeout);
  },
/**
 * 停止数据查询
 */
stopDataQuery() {
  if (this.sendInterval) {
    clearInterval(this.sendInterval);
    this.sendInterval = null;
  }
  
  if (this.commandTimeout) {
    clearTimeout(this.commandTimeout);
    this.commandTimeout = null;
  }
  
  this.setData({ 
    isQuerying: false,
    currentCommandName: ''
  });
  
  console.log('数据查询已停止');
},
  // 添加新发现的设备（去重）
  addDevices(newDevices) {
    let currentDevices = [...app.globalData.devices];
    const deviceIds = new Set(currentDevices.map(d => d.deviceId));
    let addedCount = 0;
    
    newDevices.forEach(device => {
      if (!deviceIds.has(device.deviceId)) {
        device.connected = false;
        currentDevices.push(device);
        deviceIds.add(device.deviceId);
        addedCount++;
      }
    });

    if (addedCount > 0) {
      // 更新全局变量
    app.globalData.devices = currentDevices;
    app.globalData.deviceCount = currentDevices.length;

    // 同步到页面 data（用于 WXML 渲染）
    this.setData({
      devices: currentDevices,
      deviceCount: currentDevices.length
    });
    }
  },

  // 开始扫描
  startScan() {
    if (this.data.isScanning) {
      console.log('已经在扫描中');
      return;
    }
    
    console.log('开始扫描设备');
    bluetoothManager.startScan()
      .then(() => {
        this.setData({ isScanning: true });
        console.log('扫描已启动');
      })
      .catch(err => {
        console.error('启动扫描失败', err);
        wx.showToast({ title: '扫描失败', icon: 'none' });
      });
  },

  // 停止扫描
  stopScan() {
    if (!this.data.isScanning) return;
    
    bluetoothManager.stopScan()
      .then(() => {
        this.setData({
          isScanning: false
        });
        console.log('停止扫描');
      })
      .catch(err => {
        console.error('停止扫描失败', err);
      });
  },

  // 切换扫描状态
  toggleScan() {
    if (this.data.isScanning) {
      // this.stopScan();
    } else {
      // this.startScan();
    }
  },
  //设备管理
  onDeviceTap(e){
    if(app.globalData.isConnected)
    {
      this.onDeviceDisconnect(e);
    }
    else
    {
      this.onDeviceConnect(e);
    }
  },
  // 连接设备
  onDeviceConnect(e) {
    const deviceId = e.currentTarget.dataset.deviceId;
    const name = e.currentTarget.dataset.name;

    if (!deviceId) {
      wx.showToast({ title: '设备ID无效', icon: 'none' });
      return;
    }

    console.log('[扫描页面] 尝试连接设备', { deviceId, name });

    wx.showLoading({
      title: '连接中...',
      mask: true
    });

    // 停止扫描
    // this.stopScan();

    // 使用蓝牙管理器连接
    bluetoothManager.connect(deviceId, name)
      .then(() => {
        wx.hideLoading();
        // 连接成功的处理在 onConnected 回调中完成
      })
      .catch(err => {
        wx.hideLoading();
        console.error('连接失败', err);
        wx.showModal({
          title: '连接失败',
          content: '无法连接到该设备，请重试',
          showCancel: false
        });
      });
  },
  onDeviceDisconnect(e){
    const deviceId = e.currentTarget.dataset.deviceId;
    const name = e.currentTarget.dataset.name;
    this.stopDataQuery();
    if (!deviceId) {
      wx.showToast({ title: '设备ID无效', icon: 'none' });
      return;
    }
    console.log('[扫描页面] 尝试断开设备', { deviceId, name });
    wx.showLoading({
      title: '断开中...',
      mask: true
    });
    // 开始扫描
    // this.startScan();
    // 使用蓝牙管理器连接
    bluetoothManager.disconnect(deviceId, name)
      .then(() => {
        wx.hideLoading();
        // 连接成功的处理在 onConnected 回调中完成
      })
      .catch(err => {
        wx.hideLoading();
        console.error('断开失败', err);
        wx.showModal({
          title: '断开失败',
          content: '无法断开该设备，请重试',
          showCancel: false
        });
      });
  },
  // 加载设备列表
  loadDeviceList() {
    const deviceList = app.globalData.devices || [];
    this.setData({
      devices: deviceList,
      deviceCount: deviceList.length
    });
    console.log('设备列表已更新:', deviceList.length, '个设备');
  },

  // 计算信号强度百分比
  getSignalStrength(rssi) {
    if (rssi >= -50) return 100;
    if (rssi <= -100) return 0;
    return Math.round(((rssi + 100) / 50) * 100);
  },

  // 获取服务数量
  getServiceCount(serviceUUIDs) {
    return serviceUUIDs ? serviceUUIDs.length : 0;
  }
})