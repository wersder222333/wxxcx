// utils/bluetoothManager.js

/**
 * 蓝牙通信管理器
 * 封装了微信小程序蓝牙操作的所有核心方法
 */
export default class BluetoothManager {
  constructor() {
    // 连接状态
    this._deviceId = '';        // 已连接设备的ID
    this._serviceId = '';       // 目标服务UUID
    this._writeCharId = '';     // 写入特征值UUID
    this._notifyCharId = '';    // 通知特征值UUID
    this._connected = false;    // 连接状态
    this._discovering = false;  // 搜索状态
    this._deviceList = [];      // 发现的设备列表
    
    // 状态监听器
    this._callbacks = {
      onDeviceFound: null,
      onConnected: null,
      onDisconnected: null,
      onDataReceived: null,
      onError: null
    };
    this._autoSendTimer = null;      // 自动发送定时器
    this._autoSendData = null;       // 要自动发送的数据（十六进制字符串）
    this._autoSendInterval = 1000;   // 默认 1 秒
  }

  /**
   * 初始化蓝牙适配器
   * @returns {Promise}
   */
  initAdapter() {
    return new Promise((resolve, reject) => {
      wx.openBluetoothAdapter({
        success: (res) => {
          console.log('[蓝牙管理器] 初始化成功', res);
          this.startDiscovery();
          resolve(res);
        },
        fail: (err) => {
          console.error('[蓝牙管理器] 初始化失败', err);
          if (err.errCode === 10001) {
            wx.showModal({
              title: '提示',
              content: '请检查手机蓝牙是否已开启',
              showCancel: false
            });
          }
          reject(err);
        }
      });
    });
  }

  /**
   * 获取蓝牙适配器状态
   * @returns {Promise}
   */
  getAdapterState() {
    return new Promise((resolve, reject) => {
      wx.getBluetoothAdapterState({
        success: (res) => {
          console.log('[蓝牙管理器] 适配器状态', res);
          resolve(res);
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  }

  /**
   * 开始搜索蓝牙设备
   * @param {Object} options - 搜索配置（可选）
   * @returns {Promise}
   */
  startDiscovery(options = {}) {
    if (this._discovering) {
      console.warn('[蓝牙管理器] 正在搜索中...');
      return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
      wx.startBluetoothDevicesDiscovery({
        allowDuplicatesKey: options.allowDuplicatesKey || true,
        services: options.services || [],
        success: (res) => {
          console.log('[蓝牙管理器] 开始搜索成功', res);
          this._discovering = true;
          // 开始监听设备发现事件
          this._listenDeviceFound();
          resolve(res);
        },
        fail: (err) => {
          console.error('[蓝牙管理器] 搜索失败', err);
          reject(err);
        }
      });
    });
  }

  /**
   * 监听设备发现事件
   * @private
   */
  _listenDeviceFound() {
    console.log('[蓝牙管理器] 开始监听设备');
    wx.onBluetoothDeviceFound((res) => {
      res.devices.forEach(device => {
        // 过滤无名称的设备
        if (!device.name && !device.localName) return;
        
        // 去重处理
        const idx = this._deviceList.findIndex(
          d => d.deviceId === device.deviceId
        );
        
        if (idx === -1) {
          this._deviceList.push(device);
        } else {
          this._deviceList[idx] = device;
        }
        
        // 触发回调
        if (this._callbacks.onDeviceFound) {
          this._callbacks.onDeviceFound(this._deviceList);
        }
      });
    });
  }

  /**
   * 停止搜索蓝牙设备
   * @returns {Promise}
   */
  stopDiscovery() {
    return new Promise((resolve, reject) => {
      wx.stopBluetoothDevicesDiscovery({
        success: (res) => {
          console.log('[蓝牙管理器] 停止搜索成功', res);
          this._discovering = false;
          resolve(res);
        },
        fail: (err) => {
          reject(err);
        },
        complete: () => {
          this._discovering = false;
        }
      });
    });
  }

  /**
   * 连接蓝牙设备
   * @param {String} deviceId - 设备ID
   * @returns {Promise}
   */
  connect(deviceId) {
    this._deviceId = deviceId;
    
    return new Promise((resolve, reject) => {
      wx.createBLEConnection({
        deviceId: deviceId,
        success: (res) => {
          console.log('[蓝牙管理器] 连接成功', res);
          this._connected = true;
          
          // 监听连接状态变化
          this._listenConnectionStateChange();
          
          // 连接成功后自动获取服务
          this._getServices().then(() => {
            if (this._callbacks.onConnected) {
              this._callbacks.onConnected(deviceId);
            }
            resolve(res);
          }).catch(reject);
        },
        fail: (err) => {
          console.error('[蓝牙管理器] 连接失败', err);
          reject(err);
        }
      });
    });
  }

  /**
   * 监听连接状态变化
   * @private
   */
  _listenConnectionStateChange() {
    wx.onBLEConnectionStateChange((res) => {
      console.log('[蓝牙管理器] 连接状态变化', res);
      this._connected = res.connected;
      
      if (!res.connected && this._callbacks.onDisconnected) {
        this._callbacks.onDisconnected(this._deviceId);
      }
    });
  }

  /**
   * 获取蓝牙设备服务
   * @private
   * @returns {Promise}
   */
  _getServices() {
    return new Promise((resolve, reject) => {
      wx.getBLEDeviceServices({
        deviceId: this._deviceId,
        success: (res) => {
          console.log('[蓝牙] 所有服务:', res.services);
  
          // ✅ 强制使用 Nordic UART Service
          const nusServiceUUID = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E'.toLowerCase();
          const targetService = res.services.find(s => 
            s.uuid.toLowerCase() === nusServiceUUID
          );
  
          if (!targetService) {
            // 如果没找到，再 fallback 到原来逻辑
            const fallback = res.services.find(s => !s.uuid.includes('180A')) || res.services[0];
            if (!fallback) return reject(new Error('未找到服务'));
            this._serviceId = fallback.uuid;
          } else {
            this._serviceId = targetService.uuid;
          }
  
          this._getCharacteristics().then(resolve).catch(reject);
        },
        fail: reject
      });
    });
  }

  /**
   * 获取特征值
   * @private
   * @returns {Promise}
   */
  _getCharacteristics() {
    return new Promise((resolve, reject) => {
      wx.getBLEDeviceCharacteristics({
        deviceId: this._deviceId,
        serviceId: this._serviceId,
        success: (res) => {
          console.log('[蓝牙管理器] 获取特征值成功', res);
  
          // ✅ 明确指定 Nordic UART 的写入和通知特征值
          const writeUUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
          const notifyUUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
  
          const writeChar = res.characteristics.find(c => 
            c.uuid.toLowerCase() === writeUUID
          );
          const notifyChar = res.characteristics.find(c => 
            c.uuid.toLowerCase() === notifyUUID
          );
  
          if (writeChar) this._writeCharId = writeChar.uuid;
          if (notifyChar) this._notifyCharId = notifyChar.uuid;
  
          // 如果没找到标准 UUID，再 fallback 到原逻辑
          if (!this._writeCharId || !this._notifyCharId) {
            res.characteristics.forEach(char => {
              if (char.properties.write && !this._writeCharId) {
                this._writeCharId = char.uuid;
              }
              if ((char.properties.notify || char.properties.indicate) && !this._notifyCharId) {
                this._notifyCharId = char.uuid;
              }
            });
          }
  
          if (this._notifyCharId) {
            this._enableNotify().then(resolve).catch(reject);
          } else {
            resolve();
          }
        },
        fail: reject
      });
    });
  }

  /**
   * 启用特征值变化通知
   * @private
   * @returns {Promise}
   */
  _enableNotify() {
    return new Promise((resolve, reject) => {
      wx.notifyBLECharacteristicValueChange({
        deviceId: this._deviceId,
        serviceId: this._serviceId,
        characteristicId: this._notifyCharId,
        state: true,
        success: (res) => {
          console.log('[蓝牙管理器] 启用通知成功', res);
          // 开始监听数据变化
          this._listenCharacteristicValueChange();
          resolve(res);
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  }

  /**
   * 监听特征值变化（接收蓝牙数据）
   * @private
   */
  _listenCharacteristicValueChange() {
    wx.onBLECharacteristicValueChange((res) => {
      console.log('[蓝牙管理器] 收到数据', res);
      const rawBuffer = res.value;
      // 将二进制数据转为十六进制字符串
      const hexValue = this._ab2hex(res.value);
      if (this._callbacks.onDataReceived) {
        // 同时传递原始 ArrayBuffer 和十六进制字符串
        this._callbacks.onDataReceived({
          value: rawBuffer,
          hexStr: hexValue,
          byteLength: rawBuffer.byteLength
        });
      }
    });
  }

  /**
   * ArrayBuffer转十六进制字符串
   * @param {ArrayBuffer} buffer
   * @returns {String}
   * @private
   */
  _ab2hex(buffer) {
    const hexArr = Array.prototype.map.call(
      new Uint8Array(buffer),
      function(bit) {
        return ('00' + bit.toString(16)).slice(-2);
      }
    );
    return hexArr.join('');
  }

  /**
   * 向蓝牙设备写入数据
   * @param {String|ArrayBuffer} data - 要写入的数据
   * @returns {Promise}
   */
  writeData(data) {
    // 如果传入的是字符串，转为ArrayBuffer
    let buffer = data;
    if (typeof data === 'string') {
      buffer = this._hexStringToArrayBuffer(data);
    }
    
    return new Promise((resolve, reject) => {
      wx.writeBLECharacteristicValue({
        deviceId: this._deviceId,
        serviceId: this._serviceId,
        characteristicId: this._writeCharId,
        value: buffer,
        success: (res) => {
          console.log('[蓝牙管理器] 写入成功', res);
          console.log('[蓝牙管理器] _deviceId', this._deviceId);
          console.log('[蓝牙管理器] _serviceId', this._serviceId);
          resolve(res);
        },
        fail: (err) => {
          console.error('[蓝牙管理器] 写入失败', err);
          reject(err);
        }
      });
    });
  }

  /**
   * 十六进制字符串转ArrayBuffer
   * @param {String} hexStr
   * @returns {ArrayBuffer}
   * @private
   */
  _hexStringToArrayBuffer(hexStr) {
    const length = hexStr.length / 2;
    const buffer = new ArrayBuffer(length);
    const dataView = new DataView(buffer);
    
    for (let i = 0; i < length; i++) {
      const byte = parseInt(hexStr.substr(i * 2, 2), 16);
      dataView.setUint8(i, byte);
    }
    
    return buffer;
  }

  /**
   * 断开蓝牙连接
   * @returns {Promise}
   */
  disconnect() {
    return new Promise((resolve, reject) => {
      wx.closeBLEConnection({
        deviceId: this._deviceId,
        success: (res) => {
          console.log('[蓝牙管理器] 断开连接成功', res);
          this._connected = false;
          this._resetState();
          resolve(res);
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  }

  /**
   * 关闭蓝牙适配器
   * @returns {Promise}
   */
  closeAdapter() {
    return new Promise((resolve, reject) => {
      wx.closeBluetoothAdapter({
        success: (res) => {
          console.log('[蓝牙管理器] 关闭适配器成功', res);
          this._resetState();
          resolve(res);
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  }

  /**
   * 重置内部状态
   * @private
   */
  _resetState() {
    this.stopAutoSend();
    this._deviceId = '';
    this._serviceId = '';
    this._writeCharId = '';
    this._notifyCharId = '';
    this._connected = false;
    this._discovering = false;
    this._deviceList = [];
  }

  /**
   * 注册事件回调
   * @param {String} type - 事件类型
   * @param {Function} callback - 回调函数
   */
  on(type, callback) {
    if (this._callbacks.hasOwnProperty(type)) {
      this._callbacks[type] = callback;
    }
  }

  /**
   * 移除事件回调
   * @param {String} type - 事件类型
   */
  off(type) {
    if (this._callbacks.hasOwnProperty(type)) {
      this._callbacks[type] = null;
    }
  }

  /**
   * 获取当前设备列表
   * @returns {Array}
   */
  getDeviceList() {
    return [...this._deviceList];
  }

  /**
   * 获取连接状态
   * @returns {Boolean}
   */
  isConnected() {
    return this._connected;
  }

  /**
   * 获取当前设备ID
   * @returns {String}
   */
  getDeviceId() {
    return this._deviceId;
  }
   /**
   * 开始自动发送数据
   * @param {String} hexData - 要发送的十六进制字符串，如 "AA5501"
   * @param {Number} interval - 发送间隔（毫秒）
   */
   startAutoSend(hexData, interval = 1000) {
    if (this._autoSendTimer) {
      this.stopAutoSend(); // 先停止旧的
    }
    this._autoSendData = hexData;
    this._autoSendInterval = interval;
    this._autoSendTimer = setInterval(() => 
    {
      if (this._connected && this._writeCharId) 
      {
        this.writeData(this._autoSendData).catch(err => 
          {
          wx.showToast('[自动发送] 写入失败', err);
        });
      }
      wx.showToast('[自动发送] 写入成功', hexData);
    }, this._autoSendInterval);
  }
  /**
   * 停止自动发送
   */
  stopAutoSend() {
    if (this._autoSendTimer) {
      clearInterval(this._autoSendTimer);
      this._autoSendTimer = null;
    }
  }
}

