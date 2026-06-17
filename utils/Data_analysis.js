export default class Data_analysis {
  /**
   * 解析查询全部实时数据（寄存器起始地址0x3100，长度0x002E）
   * @param {Uint8Array} data - 返回的完整数据帧（包含地址码、功能码、数据字节数、数据、CRC）
   * @returns {Object} 解析后的实时数据对象
   */
  static parseRealTimeData(data) {
    if (!data || data.length < 5) 
    {
      console.error('[ 数据解析 ] 数据为空或者长度不对', typeof data);
      return null;
    }
    console.log('[ 数据解析 ] 数据验证完整开始解析 datc=',data,);
    const dv = new DataView(data);
    let offset = 3; // 跳过地址码(1) + 功能码(1) + 数据字节数(1)
    const result = {};
    // 4. 电池包电压 (2字节) 0x3100
    const packVoltage = dv.getUint16(offset); offset += 2;
    result.packVoltage = packVoltage / 10; // 单位: V (0.1V分辨率)
    // 5. 电池电流 (2字节) 0x3101 (补码)
    let currentRaw = dv.getInt16(offset); offset += 2;
    result.current = currentRaw; // 单位: A (0.1A分辨率, 负数表示放电)
    // 6. 电池电量百分比 (2字节) 0x3102
    result.soc = dv.getUint16(offset); offset += 2; // 单位: %
    // 7. 电池单体个数 (2字节) 0x3103
    const cellCount = dv.getUint16(offset); offset += 2;
    result.cellCount = cellCount;
    // 8~37. 单体电压 (30个, 每个2字节) 0x3104 ~ 0x3121
    const cellVoltages = [];
    for (let i = 0; i < 30; i++) {
        const v = dv.getUint16(offset); offset += 2;
        cellVoltages.push(v / 1000); // 单位: V (1mV分辨率)
    }
    result.cellVoltages = cellVoltages;
    // 38. 电池最高温度 (2字节) 0x3122 (需减400, 0.1℃分辨率)
    const maxTempRaw = dv.getUint16(offset); offset += 2;
    result.maxTemperature = (maxTempRaw - 400) / 10; // 单位: ℃
    // 39. PCB温度 (2字节) 0x3123
    const pcbTempRaw = dv.getUint16(offset); offset += 2;
    result.pcbTemperature = (pcbTempRaw - 400) / 10;
    // 40. 探头个数 (2字节) 0x3124
    const probeCount = dv.getUint16(offset); offset += 2;
    result.probeCount = probeCount;
    // 41~46. 探头温度 (6个, 每个2字节) 0x3125 ~ 0x312A
    const probeTemperatures = [];
    for (let i = 0; i < 6; i++) {
        const tRaw = dv.getUint16(offset); offset += 2;
        probeTemperatures.push((tRaw - 400) / 10);
    }
    result.temperatures = probeTemperatures;
    console.log('[ 数据解析 ] 温度数据 ',probeTemperatures);
    console.log('[ 数据解析 ] 返回温度数据 ',result.temperatures);
    // 47~48. 电池容量 (高16位 + 低16位) 0x312B ~ 0x312C
    const capHi = dv.getUint16(offset); offset += 2;
    const capLo = dv.getUint16(offset); offset += 2;
    result.capacity = (capHi * 65536 + capLo) / 1000; // 单位: AH
    // 49. 循环次数 (2字节) 0x312D
    result.cycleCount = dv.getUint16(offset); offset += 2;
    // 50~51. CRC16 (2字节, 此处不校验, 仅占位)
    // offset += 2;
    console.log('[ 数据解析 ] 数据解析完成 ',result);
    return result;
  }

  /**
   * 解析查询实时状态（寄存器起始地址0x3200，长度0x000B）
   * @param {Uint8Array} data - 返回的完整数据帧
   * @returns {Object} 解析后的状态对象
   */
  static parseStatusData(data) {
      if (!data || data.length < 5) return null;
      const dv = new DataView(data);
      let offset = 3; // 跳过地址码(1) + 功能码(1) + 数据字节数(1)
      const status = {};
      // 4. 过压保护状态1 (2字节)
      status.overVoltageProtection1 = dv.getUint16(offset); offset += 2;
      // 5. 过压保护状态2
      status.overVoltageProtection2 = dv.getUint16(offset); offset += 2;
      // 6. 欠压保护状态1
      status.underVoltageProtection1 = dv.getUint16(offset); offset += 2;
      // 7. 欠压保护状态2
      status.underVoltageProtection2 = dv.getUint16(offset); offset += 2;
      // 8. 报警状态1
      status.alarmStatus1 = dv.getUint16(offset); offset += 2;
      // 9. 报警状态2
      status.alarmStatus2 = dv.getUint16(offset); offset += 2;
      // 10. 工作状态
      status.workingStatus = dv.getUint16(offset); offset += 2;
      // 11. 过压警告状态1
      status.overVoltageWarning1 = dv.getUint16(offset); offset += 2;
      // 12. 过压警告状态2
      status.overVoltageWarning2 = dv.getUint16(offset); offset += 2;
      // 13. 欠压警告状态1
      status.underVoltageWarning1 = dv.getUint16(offset); offset += 2;
      // 14. 欠压警告状态2
      status.underVoltageWarning2 = dv.getUint16(offset); offset += 2;
      // 15~16. CRC16
      return status;
  }
}