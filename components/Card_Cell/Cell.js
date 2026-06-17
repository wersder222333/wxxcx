Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 单体电压数据数组
    cellData: {
      type: Array,
      value: []
    },
    //要显示的卡片个数
    displayCount:{
      type: Number,
      value: 4
    },
    // 标题文字
    title: {
      type: String,
      value: '单体电压'
    },
    // 电压单位
    unit: {
      type: String,
      value: 'mV'
    },
    // 每行显示数量
    columns: {
      type: Number,
      value: 5
    },
    // 是否显示边框和阴影
    showBorder: {
      type: Boolean,
      value: true
    },
    // 自定义样式
    customStyle: {
      type: String,
      value: ''
    }
  },
  data:{
    displayArray:[]
  },
  /**
   * 组件的方法列表
   */
  methods: {
    // 点击单个电池事件
    onCellTap(e) {
      const index = e.currentTarget.dataset.index;
      const cell = this.data.cellData[index];
      
      // 触发自定义事件，将点击的电池信息传递给父组件
      this.triggerEvent('celltap', {
        index: index,
        cellData: cell
      });
    },
    processData(){
      const { cellData, displayCount } = this.data;
      let count = displayCount;
      if (count <= 0) {
        count = cellData.length;
      }
      count = Math.min(count, cellData.length);
      //切片处理
      const displayArray = cellData.slice(0, count);
      this.setData({ displayArray });
      console.log(`[组件] 数据已处理: 共 ${cellData.length} 个, 显示 ${count} 个`);
    }
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      // 组件加载时的初始化逻辑
      console.log('CellVoltage组件已加载');
    }
  },
  /**
   * 监听属性变化
   */
  observers: {
    'cellData, displayCount': function(cellData, displayCount) {
      // 当 cellData 或 displayCount 变化时重新处理数据
      this.processData();
    }
  }
})
 