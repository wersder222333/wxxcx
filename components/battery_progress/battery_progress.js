Component({
  properties: {
    percent: {
      type: Number,
      value: 0,
      observer: function(newVal) {
        this.updateBatteryState(newVal);
      }
    },
    voltage: {
      type: String,
      value: '0.0'
    },
    isCharging: {
      type: Boolean,
      value: false,
      observer: function(newVal) {
        this.updateChargeState(newVal);
      }
    },
    batteryWidth: {
      type: Number,
      value: 50
    },
    batteryHeight: {
      type: Number,
      value: 100
    }
  },

  data: {
    batteryLevelClass: 'low',
    fillHeight: 0,
    isChargingState: false
  },

  methods: {
    updateBatteryState(percent) {
      // 限制百分比范围
      const safePercent = Math.min(100, Math.max(0, percent));
      
      // 计算填充高度
      const fillHeight = safePercent;
      
      // 确定电池状态等级
      let levelClass = 'low';
      if (safePercent <= 15) {
        levelClass = 'critical';
      } else if (safePercent <= 30) {
        levelClass = 'low';
      } else if (safePercent <= 70) {
        levelClass = 'med';
      } else {
        levelClass = 'full';
      }

      this.setData({
        fillHeight: fillHeight,
        batteryLevelClass: levelClass
      });
    },

    updateChargeState(isCharging) {
      let newClass = this.data.batteryLevelClass;
      if (isCharging) {
        newClass += ' charging';
      }
      this.setData({
        isChargingState: isCharging,
        batteryLevelClass: newClass
      });
    }
  },

  lifetimes: {
    attached() {
      this.updateBatteryState(this.data.percent);
      this.updateChargeState(this.data.isCharging);
    }
  }
})