    miniprogram/
    ├── app.js                    # 全局配置文件
    ├── app.json                  # 应用配置
    ├── app.wxss                  # 全局样式
    │
    ├── pages/
    │   ├── index/               # 主页面（入口页面）
    │   │   ├── index.wxml
    │   │   ├── index.wxss
    │   │   ├── index.js
    │   │   └── index.json
    │   │
    │   ├── ble_scan/            # 蓝牙扫描页面
    │   │   ├── ble_scan.wxml
    │   │   ├── ble_scan.wxss
    │   │   ├── ble_scan.js
    │   │   └── ble_scan.json
    │   │
    │   ├── data_overview/       # 数据概览页面
    │   │   ├── data_overview.wxml
    │   │   ├── data_overview.wxss
    │   │   ├── data_overview.js
    │   │   └── data_overview.json
    │   │
    │   └── data_detail/         # 详细数据页面
    │       ├── data_detail.wxml
    │       ├── data_detail.wxss
    │       ├── data_detail.js
    │       └── data_detail.json
    │
    ├── components/
    │   ├── bottom_nav/          # 底部导航组件
    │   │   ├── bottom_nav.wxml
    │   │   ├── bottom_nav.wxss
    │   │   ├── bottom_nav.js
    │   │   └── bottom_nav.json
    │   │
    │   ├── cell_voltage/        # 单体电压显示组件
    │   │   ├── cell_voltage.wxml
    │   │   ├── cell_voltage.wxss
    │   │   ├── cell_voltage.js
    │   │   └── cell_voltage.json
    │   │
    │   └── pack_progress/       # 电池进度条组件
    │       ├── pack_progress.wxml
    │       ├── pack_progress.wxss
    │       ├── pack_progress.js
    │       └── pack_progress.json
    │
    └── images/
        └── scan_icon.png        # 扫描图标

🔧 技术栈
------

| 技术             | 用途         |
| -------------- | ---------- |
| **微信小程序**      | 应用框架       |
| **JavaScript** | 业务逻辑       |
| **WXML**       | 页面结构       |
| **WXSS**       | 页面样式       |
| **BLE**        | 蓝牙低功耗通信    |
| **MODBUS RTU** | 与电池保护板通信协议 |

📱 页面功能说明
---------

### 1. 主页面 (index)

* **功能**：系统入口，提供各个功能模块的导航入口
* **页面元素**：
  * 欢迎页面
  * 三个功能卡片（蓝牙扫描、数据概览、详细数据）
  * 点击卡片跳转至对应页面

### 2. 蓝牙扫描页面 (ble_scan)

* **功能**：搜索并连接蓝牙设备
* **核心功能**：
  * 初始化蓝牙适配器
  * 扫描周围蓝牙设备
  * 显示设备列表（名称、信号强度、UUID等）
  * 连接目标设备
  * 获取服务和特征值
  * 启用数据通知

### 3. 数据概览页面 (data_overview)

* **功能**：展示电池主要运行数据
* **监控参数**：
  * 电池电压（V）
  * 电池电流（A）
  * 电池功率（W）
  * 电池电量百分比（SOC）
  * 电池容量（Ah）
  * 循环次数
  * 运行状态（充电/放电/待机）

### 4. 详细数据页面 (data_detail)

* **功能**：展示电池详细数据
* **监控参数**：
  * 各电芯单体电压
  * 各温度探头温度
  * 统计数据（最大/最小/平均/压差等）

🔄 数据流
------

    蓝牙设备 → BLE通信 → 数据解析 → 全局数据缓存 → 各页面展示
                                  ↓
                           更新实时数据

### 数据管理模式

    app.globalData
    ├── deviceId              // 设备ID
    ├── deviceName            // 设备名称
    ├── serviceId             // 服务UUID
    ├── characteristicId      // 特征值UUID
    ├── isConnected           // 连接状态
    ├── batteryData           // 电池主数据
    │   ├── voltage           // 电压
    │   ├── current           // 电流
    │   ├── power             // 功率
    │   ├── capacity          // 容量
    │   ├── cycleCount        // 循环次数
    │   └── soc               // 电量百分比
    ├── cellData              // 单体电压数据
    └── tempData              // 温度数据

🔌 通信协议
-------

系统采用 **MODBUS RTU** 协议与电池保护板通信：

### 指令格式

    [地址码] [功能码] [起始地址] [数据长度] [CRC校验]

### 主要指令

| 功能   | 寄存器地址  | 长度   | 说明     |
| ---- | ------ | ---- | ------ |
| 实时数据 | 0x3100 | 0x2E | 电池实时数据 |
| 实时状态 | 0x3200 | 0x0B | 电池状态信息 |
| 序列号  | 0x9400 | 0x0F | 设备序列号  |

🚀 快速开始
-------

### 环境要求

* 微信开发者工具 (推荐版本：v2.01.2510290 及以上)
* 微信小程序AppID

### 安装部署

1. **克隆项目**
    git clone <项目地址>
    cd battery-management-system

2. **导入项目**
   
   * 打开微信开发者工具
   * 点击"导入项目"
   * 选择项目目录
   * 输入AppID

3. **配置蓝牙服务UUID**
   
   * 打开 `pages/ble_scan/ble_scan.js`
   * 根据实际设备修改服务UUID和特征值UUID

4. **编译运行**
   
   * 点击"编译"按钮
   * 使用真机调试（蓝牙功能需要真机）

### 使用流程

1. **打开应用** → 进入主页面
2. **点击"蓝牙扫描"** → 进入扫描页面
3. **点击"开始扫描"** → 搜索周围设备
4. **选择设备** → 建立蓝牙连接
5. **自动跳转** → 进入数据概览页面
6. **查看数据** → 查看电池实时数据
7. **查看详情** → 切换到详细数据页面

🧩 组件说明
-------

### 1. bottom_nav（底部导航组件）

* **功能**：页面底部导航切换
* **属性**：
  * `currentIndex`：当前选中索引
  * `navItems`：导航项配置
* **事件**：`switchtab`

### 2. cell_voltage（单体电压组件）

* **功能**：网格展示单体电压/温度数据
* **属性**：
  * `cellData`：数据数组
  * `title`：标题
  * `unit`：单位
  * `columns`：列数
* **事件**：`celltap`

### 3. pack_progress（电池进度条组件）

* **功能**：显示电池电量百分比
* **属性**：
  * `percent`：百分比值
* **事件**：`percentChange`

📊 数据解析类
--------

### Data_analysis 类

位于项目中的解析工具类，用于解析MODBUS RTU协议返回的数据。
    // 实时数据解析
    Data_analysis.parseRealTimeData(rawData);

    // 状态数据解析
    Data_analysis.parseStatusData(rawData);
⚠️ 注意事项
-------

1. **蓝牙权限**：真机调试时需要开启手机蓝牙和定位权限
2. **数据格式**：需根据实际电池型号调整MODBUS协议解析参数
3. **性能优化**：定时器频率建议保持在1秒/次，避免过高频率导致性能问题
4. **错误处理**：蓝牙连接失败时提供友好的用户提示
5. **电池类型**：支持30串智能保护板，单体电压和温度探头数量可配置

🔜 后续优化方向
---------

* [ ]  添加数据历史记录功能
* [ ]  支持多设备切换
* [ ]  添加报警推送功能
* [ ]  优化数据图表展示
* [ ]  支持数据导出
* [ ]  添加固件升级功能
* [ ]  国际化支持

📝 版本记录
-------

| 版本     | 日期         | 更新内容        |
| ------ | ---------- | ----------- |
| v1.0.0 | 2024-06-16 | 初始版本，完成基础功能 |

👥 贡献指南
-------

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/xxx`)
3. 提交更改 (`git commit -m '添加xxx功能'`)
4. 推送到分支 (`git push origin feature/xxx`)
5. 提交Pull Request

📄 许可证
------

本项目仅供学习交流使用。

* * *

**⚠️ 温馨提示**：本系统涉及锂电池相关操作，请在使用时注意安全，确保电池型号匹配和参数正确配置。
