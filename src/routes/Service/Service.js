/**
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


import React, { PureComponent } from 'react';
import { connect } from 'dva';
import { Row, Col, Select, Card, Form, Breadcrumb } from 'antd';
import { AppTopology } from 'components/Topology';
import { Panel } from 'components/Page';
import RankList from 'components/RankList';
import ServiceInstanceLitePanel from 'components/ServiceInstanceLitePanel';
import ServiceInstance from './ServiceInstance';
import { getServiceInstanceId, redirect } from '../../utils/utils';

const { Option } = Select;
const { Item: FormItem } = Form;

const middleColResponsiveProps = {
  xs: 24,
  sm: 24,
  md: 12,
  lg: 12,
  xl: 12,
  style: { marginTop: 8 },
};

@connect(state => ({
  service: state.service,
  duration: state.global.duration,
  globalVariables: state.global.globalVariables,
}))
@Form.create({
  mapPropsToFields(props) {
    const { variables: { values, labels } } = props.service;
    return {
      serviceId: Form.createFormField({
        value: { key: values.serviceId ? values.serviceId : '', label: labels.serviceId ? labels.serviceId : '' },
      }),
    };
  },
})
export default class Service extends PureComponent {
  componentDidMount() {
    this.props.dispatch({
      type: 'service/initOptions',
      payload: { variables: this.props.globalVariables },
    });
  }

  componentWillUpdate(nextProps) {
    if (nextProps.globalVariables.duration === this.props.globalVariables.duration) {
      return;
    }
    this.props.dispatch({
      type: 'service/initOptions',
      payload: { variables: nextProps.globalVariables },
    });
  }

  handleSelect = (selected) => {
    this.props.dispatch({
      type: 'service/saveVariables',
      payload: {
        values: { serviceId: selected.key },
        labels: { serviceId: selected.label },
      },
    });
  }

  handleChange = (variables) => {
    const { data: { serviceInstanceInfo, showServiceInstance } } = this.props.service;
    if (showServiceInstance) {
      this.handleSelectServiceInstance(serviceInstanceInfo.key, serviceInstanceInfo);
    } else {
      this.props.dispatch({
        type: 'service/fetchData',
        payload: { variables, reducer: 'saveService' },
      });
    }
  }

  handleGoService = () => {
    this.props.dispatch({
      type: 'service/hideServiceInstance',
    });
  }

  handleGoServiceInstance = () => {
    this.props.dispatch({
      type: 'service/showServiceInstance',
    });
  }

  handleSelectServiceInstance = (serviceInstanceId, serviceInstanceInfo) => {
    const { globalVariables: { duration } } = this.props;
    this.props.dispatch({
      type: 'service/fetchServiceInstance',
      payload: { variables: { duration, serviceInstanceId }, serviceInstanceInfo },
    });
  }

  renderApp = () => {
    const { getFieldDecorator } = this.props.form;
    const { variables: { values, options, labels }, data } = this.props.service;
    return (
      <div>
        <Form layout="inline">
          <FormItem>
            {getFieldDecorator('serviceId')(
              <Select
                showSearch
                optionFilterProp="children"
                style={{ width: 200 }}
                placeholder="Select a service"
                labelInValue
                onSelect={this.handleSelect.bind(this)}
              >
                {options.serviceId && options.serviceId.map(service =>
                  <Option key={service.key} value={service.key}>{service.label}</Option>)}
              </Select>
            )}
          </FormItem>
        </Form>
        <Panel
          variables={values}
          globalVariables={this.props.globalVariables}
          onChange={this.handleChange}
        >
          <Row gutter={0}>
            <Col {...{ ...middleColResponsiveProps, xl: 16, lg: 12, md: 24 }}>
              <Card
                title="Service Map"
                bordered={false}
                bodyStyle={{ padding: 0 }}
              >
                <AppTopology
                  elements={data.getServiceTopology}
                  height={335}
                  layout={{
                    name: 'dagre',
                    rankDir: 'LR',
                    minLen: 4,
                  }}
                />
              </Card>
            </Col>
            <Col {...{ ...middleColResponsiveProps, xl: 8, lg: 12, md: 24 }}>
              <Card
                bordered={false}
                bodyStyle={{ padding: '10px 10px', height: 391 }}
              >
                <ServiceInstanceLitePanel
                  data={data}
                  serviceInstanceList={data.getServiceInstances}
                  duration={this.props.duration}
                  onSelectServiceInstance={this.handleSelectServiceInstance}
                  onMoreServiceInstance={this.handleGoServiceInstance}
                />
              </Card>
            </Col>
          </Row>
          <Row gutter={8}>
            <Col {...{ ...middleColResponsiveProps, xl: 12, lg: 12, md: 24 }}>
              <Card
                title="Running ServiceInstance"
                bordered={false}
                bodyStyle={{ padding: 5 }}
              >
                <RankList
                  data={data.getServiceInstanceThroughput}
                  renderValue={_ => `${_.value} cpm`}
                  color="#965fe466"
                />
              </Card>
            </Col>
            <Col {...{ ...middleColResponsiveProps, xl: 12, lg: 12, md: 24 }}>
              <Card
                title="Slow Endpoint"
                bordered={false}
                bodyStyle={{ padding: '0px 10px' }}
              >
                <RankList
                  data={data.getSlowEndpoint}
                  renderValue={_ => `${_.value} ms`}
                  onClick={(key, item) => redirect(this.props.history, '/monitor/endpoint', { key,
                    label: item.label,
                    serviceId: values.serviceId,
                    serviceName: labels.serviceId })}
                />
              </Card>
            </Col>
          </Row>
        </Panel>
      </div>
    );
  }

  render() {
    const { service, duration } = this.props;
    const { variables, data } = service;
    const { showServiceInstance, serviceInstanceInfo } = data;
    return (
      <Row type="flex" justify="start">
        {showServiceInstance ? (
          <Col span={showServiceInstance ? 24 : 0}>
            <Breadcrumb>
              <Breadcrumb.Item>
                Service
              </Breadcrumb.Item>
              <Breadcrumb.Item>
                <a onClick={this.handleGoService}>{variables.labels.serviceId}</a>
              </Breadcrumb.Item>
              <Breadcrumb.Item>{getServiceInstanceId(serviceInstanceInfo)}</Breadcrumb.Item>
            </Breadcrumb>
            <Panel
              variables={variables.values}
              globalVariables={this.props.globalVariables}
              onChange={this.handleChange}
            >
              <ServiceInstance data={data} duration={duration} />
            </Panel>
          </Col>
         ) : null}
        <Col span={showServiceInstance ? 0 : 24}>
          {this.renderApp()}
        </Col>
      </Row>
    );
  }
}