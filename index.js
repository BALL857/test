import React from 'react';
import { Form, Button, Card, Row, Col, Select,message,InputNumber } from 'antd';
import ReactEcharts from 'echarts-for-react';
// 引入饼图和折线图
import 'echarts/lib/chart/bar'
// 引入提示框和标题组件
import 'echarts/lib/component/tooltip';
import 'echarts/lib/component/title';
import 'echarts/lib/component/legend';
import 'echarts/lib/component/markPoint';
import './index.less'

import GaussianUnknownMean from './GaussianUnknowMean'

const { Option } = Select;

// 串口通信部分
const SerialPort = window.require('serialport');

// fft
var dft = window.require('fft-js').dft;
const fftUtil = window.require('fft-js').util;

const layout = {
    labelCol: {
        span: 8,
    },
    wrapperCol: {
        span: 16,
    },
};
const tailLayout = {
    wrapperCol: {
        offset: 8,
        span: 16,
    },
};

// 初始化数据序列
const arrmax = 1000;    // 显示数据最大长度
const buflen = 100;     // 暂存数组长度
var databuf = [];       // 波形时间暂存数据
var timebuf = [];       // 波形数据暂存数组
var timeshow = [];      // 整体显示波形时间
var datashow = [];      // 整体显示波形数据
let showstate = false;  // 标志纹波是否发生
let riptimeocc = '';    // 标志纹波发生时间

var timeseq = 0;        // 数据驱动起始值
let datamean = 10000    // 数据均值
let datavar = 1000      // 数据方差
let ripam = 500         // 纹波幅值
let timechangeoc= 550   // 数据变化点选择


// 端口参数
var comname='COM1';     // 默认端口值

// BOCD参数
const hazard = 1/100  // Constant prior on changepoint probability.
const mean0  = 10000      // The prior mean on the mean parameter.
const var0   = 2000     // The prior variance for mean parameter.
const varx   = 2000     // The known variance of the data.
let bocdmode = new GaussianUnknownMean(mean0,var0,varx,hazard);  // bocd纹波模型建立
let bocdmassage = true;     // 是否有纹波产生
let bocdres = 0;            // BOCD结果
let bocdlim = 0.1;          // BOCD下限值

// 获取正态分布数值
function getnormnub(mean,std){
    let u=0,v=0,w=0,c=0;
    do{
        // 获得两个（-1，1）的独立随机变量
        u = Math.random()*2-1;
        v = Math.random()*2-1;
        w = u*u+v*v;
    }while(w===0||w>=1)
    //这里就是 Box-Muller转换
    c = Math.sqrt((-2*Math.log(w))/w);
    // 返回两个标准正态分布的随机数
    // u*c和v*c
    return mean+(u*c*std);
}


//card中的标签页
// const { TabPane } = Tabs;
// 端口设置

export default class Demo extends React.Component {
    constructor(props) {
        super(props);
        
        this.state = this.getinitstate();
        // const serialport = new SerialPort('COM2',{
        //     baudRate: 9600
        // })
        // Switches the port into "flowing mode"

        setInterval(() => {
            if (showstate) {
                // 数据生成
                if(timeseq<1000){
                    let datain = 0;
                    if (timeseq<timechangeoc){
                        datain = getnormnub(datamean,Math.sqrt(datavar));
                    } else{
                        datain = ripam * Math.cos(Math.PI / 5 * timeseq)+datamean;
                    }
                    var now = new Date();
                    timebuf.push([now.getMinutes(), now.getSeconds() + 1, now.getMilliseconds()].join(':'));
                    databuf.push(datain);
                    if (bocdmassage){
                        bocdres = bocdmode.bocd(datain)
                        if(bocdres< bocdlim){
                            bocdmassage = false;
                            message.error('出现问题波形');
                            riptimeocc = now.getFullYear() + '年' + (now.getMonth()+1) + '月' + now.getDate() + '日' + now.getHours() + '时'
                        }
                    } 
                }
                timeseq++;
                if (databuf.length === buflen) {
                    if (datashow.length === arrmax) {
                        timeshow.splice(0, buflen);
                        datashow.splice(0, buflen);
                    }
                    timeshow.push.apply(timeshow, timebuf);
                    datashow.push.apply(datashow, databuf);
                    timebuf = [];
                    databuf = [];
                    if (bocdmassage || bocdres === 0){
                        this.setState({
                            timeshow: timeshow,
                            datashow: datashow
                        });
                    } else{
                        bocdres = 0;
                        this.setState({
                            timeshow: timeshow,
                            datashow: datashow,
                            riptime: timeshow.slice(-150), 
                            ripdata: datashow.slice(-150),
                            riptimeocc: riptimeocc
                        });
                    }
                    bocdmode.recovery_params(mean0,var0,varx);
                }   
            } else{

            }
        }, 1);
    };

    getinitstate = () => {
        let filechange = {};
        filechange.datashow = datashow;
        filechange.timeshow = timeshow; 
        filechange.ports = [];
        filechange.ripdata = [];
        filechange.riptime = [];
        filechange.riptimeocc = '';
        filechange.STFTdata = [];
        filechange.STFTFs = [];
        return filechange;

    }

    componentWillUnmount() {
    }

    // 下发指令
    // sendCommand = (bufferStr) => {
    //     let theBuffer = new Buffer(bufferStr, "hex");
    //    port.write(theBuffer, function (error) {
    //         //指令下发
    //         if (error) {
    //             console.log("发送错误" + error)
    //         } else {
    //             console.log("自动下发的命令：" + bufferStr);
    //         }
    //     })
    // };
    //计算安全性
    col = () => {   
        // this.sendCommand('5AA503700E21009F7E');
        let signal = [];
        const N = 40;
        const Fs = 1000;
        for (var i = 0; i < N; i++) {
            // signal.push(20 * Math.sin(i * Math.PI / 10)+50 * Math.sin(i * Math.PI / 20));
            signal.push(20 * Math.sin(i * Math.PI / 10));
        }
        console.log(signal);
        // signal = [1,0,1,0,1,0,1,0];
        let phasors = dft(signal);
        var frequencies = fftUtil.fftFreq(phasors, Fs), // Sample rate and coef is just used for length, and frequency step
            magnitudes = fftUtil.fftMag(phasors);
        var both = frequencies.map(function (f, ix) {
            return { frequency: f, magnitude: magnitudes[ix]/N*2 };
        });
        console.log(both);
    }
    

    // 端口扫描
    scanport = () =>{
        SerialPort.list().then(
            ports => {
                let portslist = [];
                ports.forEach((value) => {
                    console.log(value)
                    portslist.push(
                        <Option key={value.path}>
                            {value.path}
                        </Option>
                    );
                });
                this.setState({ports:portslist}) 
            },
            err => console.error(err)
        );
    }

    // 设置并打开端口
    porthandleChange = (title) =>{
        console.log(`selected :`+title);
        comname=title;
    }

    // 设置端口表单
    formRef = React.createRef();
    
    // 端口设置完成后回调
    portsetonFinish = (values) => {
        console.log(values);

        // const port = new SerialPort(comname, {
        //     baudRate: values.baudRate,
        //     dataBits:values.dataBits,
        //     parity:values.parity,
        //     stopBits:values.stopBits,
        //     rtsct:values.liukong === "rtsct"
        // })
        showstate = !showstate;
        // 开始监测
        // port.on('data', (data) => {
        //     let x = data.readUInt8(0);
        //     console.log(x);
            
        // })

    }

    // hanning window
    hanning = (M)=>{
        let windows = [];
        for(let i = 0;i<M;i++){
            windows.push(0.5-0.5*Math.cos(2*Math.PI*i/(M-1)))
        }
        return windows
    } 

    // 绘制SFT图像部分
    STFTonFinish = (values)=>{
        let origindata = this.state.ripdata;
        const datalen = origindata.length;
        const windows = this.hanning(values.frame_size);
        const Fs = 1000;
        let res = [];
        let Fres = [];
        for(let i = 0;i<(datalen-values.frame_size)/values.frame_stride+1;i++){
            let addwindata = [];
            for(let j=0;j<values.frame_size;j++){
                addwindata.push((origindata[i*values.frame_stride+j]-datamean)*windows[j]);
            }
            let phasors = dft(addwindata);
            var frequencies = fftUtil.fftFreq(phasors, Fs), // Sample rate and coef is just used for length, and frequency step
                magnitudes = fftUtil.fftMag(phasors);
            console.log(magnitudes);
            frequencies.map(function (f, ix) {
                res.push([i,f,magnitudes[ix] / values.frame_size * 2]);
            });
            Fres = frequencies;
        }
        this.setState({
            STFTdata: res,
            STFTFs: Fres
        });
    }

    // 重置纹波波形图
    resetrip = () => {
        bocdmassage = true;
        this.setState({
            ripdata: [],
            riptime: [],
            riptimeocc: ''
        });
    }
    resetSTFT = () =>{
        this.setState({
            STFTdata:[],
            STFTFs:[]
        })
    }

    // 总数据图
    getoption = () => {
        let option = {
            tooltip: {
                trigger: 'axis',
                position: function (pt) {
                    return [pt[0], '10%'];
                }
            },
            toolbox: {
                feature: {
                    dataView: {
                        show: true
                    },
                    dataZoom: {
                        yAxisIndex: 'none'
                    },
                    restore: {},
                    saveAsImage: {}
                }
            },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: this.state.timeshow
            },
            yAxis: {
                max: function (value) {
                    return value.max + 20;
                },
                min: function (value) {
                    return value.min - 20;
                },
                type: 'value',
                boundaryGap: [0, '100%']
            },
            dataZoom: [{
                type: 'inside',
                start: 0,
                end: 100
            }, {
                start: 0,
                end: 100,
                handleIcon: 'M10.7,11.9v-1.3H9.3v1.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4v1.3h1.3v-1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7V23h6.6V24.4z M13.3,19.6H6.7v-1.4h6.6V19.6z',
                handleSize: '80%',
                handleStyle: {
                    color: '#fff',
                    shadowBlur: 3,
                    shadowColor: 'rgba(0, 0, 0, 0.6)',
                    shadowOffsetX: 2,
                    shadowOffsetY: 2
                }
            }],
            series: [
                {
                    name: '模拟数据',
                    type: 'line',
                    smooth: true,
                    symbol: 'none',
                    sampling: 'average',
                    itemStyle: {
                        color: 'rgb(255, 70, 131)'
                    },
                    animation: false,
                    data: this.state.datashow
                }
            ]
        };
        return option
    }

    // 纹波数据图
    getripoption = () => {
        let option = {
            tooltip: {
                trigger: 'axis',
                position: function (pt) {
                    return [pt[0], '10%'];
                }
            },
            toolbox: {
                feature: {
                    dataView: {
                        show: true
                    },
                    dataZoom: {
                        yAxisIndex: 'none'
                    },
                    restore: {},
                    saveAsImage: {}
                }
            },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: this.state.riptime
            },
            yAxis: {
                max: function (value) {
                    return value.max + 20;
                },
                min: function (value) {
                    return value.min - 20;
                },
                type: 'value',
                boundaryGap: [0, '100%']
            },
            dataZoom: [{
                type: 'inside',
                start: 0,
                end: 100
            }, {
                start: 0,
                end: 100,
                handleIcon: 'M10.7,11.9v-1.3H9.3v1.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4v1.3h1.3v-1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7V23h6.6V24.4z M13.3,19.6H6.7v-1.4h6.6V19.6z',
                handleSize: '80%',
                handleStyle: {
                    color: '#fff',
                    shadowBlur: 3,
                    shadowColor: 'rgba(0, 0, 0, 0.6)',
                    shadowOffsetX: 2,
                    shadowOffsetY: 2
                }
            }],
            series: [
                {
                    name: '纹波数据',
                    type: 'line',
                    smooth: true,
                    symbol: 'none',
                    sampling: 'average',
                    itemStyle: {
                        color: 'rgb(255, 70, 131)'
                    },
                    animation: false,
                    data: this.state.ripdata
                }
            ]
        };
        return option
    }

    // STFT数据图
    getSTFT=()=>{
        let option = {
            tooltip: {
                position: 'top'
            },
            animation: false,
            grid: {
                height: '50%',
                top: '10%'
            },
            xAxis: {
                type: 'category',
            },
            yAxis: {
                type: 'category',
                data: this.setState.STFTFs
            },
            visualMap: {
                min: 0,
                max: 200,
                calculable: true,
                orient: 'horizontal',
                left: 'center',
                bottom: '25%'
            },
            series: [{
                name: '加窗幅值',
                type: 'heatmap',
                data: this.state.STFTdata,
                emphasis: {
                    itemStyle: {
                        shadowBlur: 100,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }]
        };
        return option;
    }

    render() {
        return (
            <div>
                <Row>
                    <Col span={7}>
                        <Row>
                            <Card title="串口设置" className="seriesset">
                                <Form 
                                {...layout} 
                                ref={this.formRef} 
                                name="portset" 
                                onFinish={this.portsetonFinish}
                                initialValues={{
                                    baudRate:9600,
                                    dataBits:8,
                                    parity:"none",
                                    stopBits:1,
                                    liukong:"none"

                                }}
                                >
                                    <Form.Item label="端口监测">
                                        <Button
                                            type="primary"
                                            onClick={() => this.scanport()}
                                        >
                                            端口扫描
                                        </Button>
                                    </Form.Item>
                                    <Form.Item
                                        name = "comselect"
                                        label="端口选择"
                                        rules={[
                                            {
                                                required: true,
                                            },
                                        ]}
                                    >
                                        <Select onChange={this.porthandleChange}>
                                            {this.state.ports}
                                        </Select>
                                    </Form.Item>
                                    <Form.Item
                                        name="baudRate"
                                        label="波特率"
                                        rules={[
                                            {
                                                required: true,
                                            },
                                        ]}
                                    >
                                        <Select>
                                            <Option value={9600}>
                                                9600
                                            </Option>
                                            <Option value={19200}>
                                                19200
                                            </Option>
                                            <Option value={38400}>
                                                38400
                                            </Option>
                                            <Option value={57600}>
                                                57600
                                            </Option>
                                            <Option value={115200}>
                                                115200
                                            </Option>
                                            <Option value={'custom'}>
                                                custom
                                            </Option>
                                        </Select>
                                    </Form.Item>
                                    <Form.Item
                                        name="dataBits"
                                        label="数据位"
                                        rules={[
                                            {
                                                required: true,
                                            },
                                        ]}
                                    >
                                        <Select initialvalues={8}>
                                            <Option value={8}>
                                                8
                                            </Option>
                                            <Option value={7}>
                                                7
                                            </Option>
                                            <Option value={6}>
                                                6
                                            </Option>
                                            <Option value={5}>
                                                5
                                            </Option>
                                        </Select>
                                    </Form.Item>
                                    <Form.Item
                                        name="parity"
                                        label="校验位"
                                        rules={[
                                            {
                                                required: true,
                                            },
                                        ]}
                                    >
                                        <Select initialvalues="none">
                                            <Option value="none">
                                                none
                                            </Option>
                                            <Option value="even">
                                                even
                                            </Option>
                                            <Option value="odd">
                                                odd
                                            </Option>
                                            <Option value="mark">
                                                mark
                                            </Option>
                                            <Option value="space">
                                                space
                                            </Option>
                                        </Select>
                                    </Form.Item>
                                    <Form.Item
                                        name="stopBits"
                                        label="停止位"
                                        rules={[
                                            {
                                                required: true,
                                            },
                                        ]}
                                    >
                                        <Select initialvalues={1}>
                                            <Option value={1}>
                                                1
                                            </Option>
                                            <Option value={1.5}>
                                                1.5
                                            </Option>
                                            <Option value={2}>
                                                2
                                            </Option>
                                        </Select>
                                    </Form.Item>
                                    <Form.Item
                                        name="liukong"
                                        label="流控"
                                        rules={[
                                            {
                                                required: true,
                                            },
                                        ]}
                                    >
                                        <Select initialvalues="none">
                                            <Option value="none">
                                                none
                                            </Option>
                                            <Option value="rtscts">
                                                rtscts
                                            </Option>
                                        </Select>
                                    </Form.Item>
                                    <Form.Item {...tailLayout}>
                                        <Button type="primary" htmlType="submit">
                                            开始/暂停监测
                                        </Button>
                                    </Form.Item>
                                </Form>
                            </Card>

                        </Row>
                    </Col>
                    <Col span={17}>
                        <Card title='监测图形' className="monitorcard">
                            <ReactEcharts option={this.getoption()} style={{ height: 400 }} />
                        </Card>
                    </Col>
                </Row>
                <Row>
                    <Col span={12}>
                        <Card 
                            title="问题波形截选" 
                            className="errorplot" 
                            extra={
                            <Button
                                type = "primary"
                                onClick={() => this.resetrip()}
                            >
                                重置
                            </Button>
                            }
                        >
                            电能质量问题发生时刻：{this.state.riptimeocc}
                            <ReactEcharts option={this.getripoption()} style={{ height: 380 }} />
                            
                        </Card>
                    </Col>
                    <Col span={12}>
                        <Card 
                            title="STFT分析" 
                            className="STFTplot"
                            extra={
                                <Button
                                    type = "primary"
                                    onClick= {() => this.resetSTFT()}
                                >
                                    重置
                                </Button>
                                }
                            >
                            <Form
                                name="SFTset"
                                layout="inline"
                                ref={this.formRef} 
                                onFinish={this.STFTonFinish}
                                initialValues={{
                                    frame_size: 100,
                                    frame_stride: 1
                                }}
                            >
                                <Form.Item
                                    name="frame_size"
                                    label="单帧大小"
                                    rules={[
                                        {
                                            required: true,
                                        },
                                    ]}
                                >
                                    <InputNumber min={1}/>
                                </Form.Item>
                                <Form.Item 
                                    name="frame_stride"
                                    label="滑动尺寸"
                                    rules={[
                                        {
                                            required: true,
                                        },
                                    ]}
                                >
                                    <InputNumber min={1}/>
                                </Form.Item>
                                <Form.Item >
                                    <Button type="primary" htmlType="submit">设定并计算</Button>
                                </Form.Item>
                            </Form>
                            <ReactEcharts option={this.getSTFT()} style={{ height: 500 }} />
                        </Card>
                    </Col>
                </Row>
            </div>
        );
    }
}

