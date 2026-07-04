import React, { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Select, Button, Card, Typography, Row, Col, Divider, message, Upload } from 'antd';
import { Car, DollarSign, FileText, User, UploadCloud } from 'lucide-react';
import { salesApi, getImageUrl } from '../api';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface Props {
  initialData?: any;
  onSuccess?: () => void;
}

const AddVehicleSale: React.FC<Props> = ({ initialData, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [fileList, setFileList] = useState<any[]>([]);

  useEffect(() => {
    if (initialData) {
      form.setFieldsValue({
        make: initialData.make,
        model: initialData.model,
        year: initialData.year,
        registrationNumber: initialData.registrationNumber,
        vin: initialData.vin,
        mileage: initialData.mileage,
        fuelType: initialData.fuelType,
        transmission: initialData.transmission,
        condition: initialData.condition,
        askingPrice: initialData.askingPrice,
        commissionRate: initialData.commissionRate,
        isNegotiable: initialData.isNegotiable,
        title: initialData.title,
        description: initialData.description,
        contactNumber: initialData.contactNumber,
        seoTags: initialData.seoTags,
        ownerName: initialData.originalOwnerDetails?.name,
        ownerPhone: initialData.originalOwnerDetails?.phone,
        ownerEmail: initialData.originalOwnerDetails?.email,
      });
      if (initialData.images) {
        setExistingImages(initialData.images);
      }
    } else {
      form.resetFields();
      setExistingImages([]);
      setFileList([]);
    }
  }, [initialData, form]);

  const onFinish = async (values: any) => {
    try {
      setLoading(true);
      
      const formData = new FormData();
      formData.append('make', values.make);
      formData.append('model', values.model);
      formData.append('year', values.year);
      formData.append('registrationNumber', values.registrationNumber);
      if (values.vin) formData.append('vin', values.vin);
      formData.append('mileage', values.mileage);
      formData.append('fuelType', values.fuelType);
      formData.append('transmission', values.transmission);
      formData.append('condition', values.condition);
      formData.append('askingPrice', values.askingPrice);
      formData.append('commissionRate', values.commissionRate || 0);
      formData.append('isNegotiable', values.isNegotiable || false);
      formData.append('title', values.title);
      formData.append('description', values.description);
      formData.append('status', 'New');
      if (values.contactNumber) formData.append('contactNumber', values.contactNumber);
      if (values.seoTags) formData.append('seoTags', JSON.stringify(values.seoTags));
      
      const ownerDetails = {
        name: values.ownerName,
        phone: values.ownerPhone,
        email: values.ownerEmail,
      };
      formData.append('originalOwnerDetails', JSON.stringify(ownerDetails));

      if (initialData) {
        formData.append('existingImages', JSON.stringify(existingImages));
      }

      fileList.forEach(file => {
        formData.append('images', file.originFileObj);
      });

      if (initialData) {
        await salesApi.updateVehicleSale(initialData._id, formData);
        message.success('Vehicle sale listing updated successfully!');
      } else {
        await salesApi.createVehicleSale(formData);
        message.success('Vehicle successfully listed for sale!');
      }
      
      form.resetFields();
      setFileList([]);
      setExistingImages([]);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      message.error(error.message || `Failed to ${initialData ? 'update' : 'list'} vehicle`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card bordered={false} style={{ borderRadius: '12px', border: '1px solid #e2e8f0', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <Title level={4} style={{ color: '#0f172a', margin: 0 }}>{initialData ? 'Edit Vehicle Sale Listing' : 'List Vehicle for Sale'}</Title>
        <Text type="secondary">Internal Staff Tool - {initialData ? 'Update an existing vehicle in the sales division' : 'Add a new vehicle to the sales division'}</Text>
      </div>

      <Form form={form} layout="vertical" onFinish={onFinish}>
        
        <Divider orientation="left"><Car size={16} style={{ marginRight: 8, verticalAlign: 'text-bottom' }}/> Vehicle Specs</Divider>
        <Row gutter={16}>
          <Col span={12} xs={24} md={12}>
            <Form.Item name="make" label="Make" rules={[{ required: true, message: 'Make is required' }]}>
              <Input placeholder="e.g. Toyota" />
            </Form.Item>
          </Col>
          <Col span={12} xs={24} md={12}>
            <Form.Item name="model" label="Model" rules={[{ required: true, message: 'Model is required' }]}>
              <Input placeholder="e.g. Corolla" />
            </Form.Item>
          </Col>
          <Col span={8} xs={24} md={8}>
            <Form.Item name="year" label="Year" rules={[{ required: true, message: 'Year is required' }]}>
              <InputNumber placeholder="e.g. 2018" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8} xs={24} md={8}>
            <Form.Item name="registrationNumber" label="Registration No." rules={[{ required: true, message: 'Reg number is required' }]}>
              <Input placeholder="e.g. CBA-1234" />
            </Form.Item>
          </Col>
          <Col span={8} xs={24} md={8}>
            <Form.Item name="vin" label="VIN (Optional)">
              <Input placeholder="Chassis Number" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={6} xs={12} md={6}>
            <Form.Item name="mileage" label="Mileage (km)" rules={[{ required: true, message: 'Required' }]}>
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={6} xs={12} md={6}>
            <Form.Item name="fuelType" label="Fuel Type" rules={[{ required: true, message: 'Required' }]}>
              <Select placeholder="Select">
                <Option value="Petrol">Petrol</Option>
                <Option value="Diesel">Diesel</Option>
                <Option value="Hybrid">Hybrid</Option>
                <Option value="Electric">Electric</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={6} xs={12} md={6}>
            <Form.Item name="transmission" label="Transmission" rules={[{ required: true, message: 'Required' }]}>
              <Select placeholder="Select">
                <Option value="Automatic">Automatic</Option>
                <Option value="Manual">Manual</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={6} xs={12} md={6}>
            <Form.Item name="condition" label="Condition" rules={[{ required: true, message: 'Required' }]}>
              <Select placeholder="Select">
                <Option value="New">New</Option>
                <Option value="Used">Used</Option>
                <Option value="Reconditioned">Reconditioned</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left"><DollarSign size={16} style={{ marginRight: 8, verticalAlign: 'text-bottom' }}/> Financials</Divider>
        <Row gutter={16}>
          <Col span={8} xs={24} md={8}>
            <Form.Item name="askingPrice" label="Asking Price (LKR)" rules={[{ required: true, message: 'Price required' }]}>
              <InputNumber
                style={{ width: '100%' }}
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value!.replace(/\$\s?|(,*)/g, '') as any}
                placeholder="e.g. 15000000"
              />
            </Form.Item>
          </Col>
          <Col span={8} xs={24} md={8}>
            <Form.Item name="commissionRate" label="Commission (%) (Optional)">
              <InputNumber style={{ width: '100%' }} min={0} max={100} />
            </Form.Item>
          </Col>
          <Col span={8} xs={24} md={8}>
            <Form.Item name="isNegotiable" label="Negotiable?">
              <Select defaultValue={false}>
                <Option value={true}>Yes</Option>
                <Option value={false}>No</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">
          <User size={16} style={{ marginRight: 8, verticalAlign: 'text-bottom' }}/> 
          Seller / Owner Details <Text type="secondary" style={{ fontSize: '0.8rem', marginLeft: '12px' }}>(Internal Use Only - This will be hidden from the public)</Text>
        </Divider>
        <Row gutter={16}>
          <Col span={8} xs={24} md={8}>
            <Form.Item name="ownerName" label="Owner Name" rules={[{ required: true, message: 'Required' }]}>
              <Input placeholder="Full Name" />
            </Form.Item>
          </Col>
          <Col span={8} xs={24} md={8}>
            <Form.Item name="ownerPhone" label="Owner Phone" rules={[{ required: true, message: 'Required' }]}>
              <Input placeholder="+94..." />
            </Form.Item>
          </Col>
          <Col span={8} xs={24} md={8}>
            <Form.Item name="ownerEmail" label="Owner Email (Optional)">
              <Input type="email" placeholder="email@example.com" />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left"><FileText size={16} style={{ marginRight: 8, verticalAlign: 'text-bottom' }}/> Listing Content</Divider>
        <Form.Item name="title" label="Listing Title" rules={[{ required: true, message: 'Title is required' }]}>
          <Input placeholder="e.g. Mint Condition Toyota Corolla 2018" />
        </Form.Item>
        
        <Form.Item name="description" label="Detailed Description (Service History, Faults, etc.)" rules={[{ required: true, message: 'Description is required' }]}>
          <TextArea rows={6} placeholder="Provide a comprehensive description of the vehicle's condition, history, and any modifications." />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12} xs={24} md={12}>
            <Form.Item name="contactNumber" label="Sales Contact Number" rules={[{ required: true, message: 'Contact Number is required' }]}>
              <Input placeholder="+94..." />
            </Form.Item>
          </Col>
          <Col span={12} xs={24} md={12}>
            <Form.Item name="seoTags" label="SEO Keywords (Max 5)">
              <Select 
                mode="tags" 
                style={{ width: '100%' }} 
                placeholder="Type and press enter (e.g. SUV, Hybrid)"
                tokenSeparators={[',']}
                maxTagCount={5}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Vehicle Images">
          {existingImages.length > 0 && (
            <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {existingImages.map((img, idx) => (
                <div key={idx} style={{ position: 'relative' }}>
                  <img src={getImageUrl(img)} alt="Vehicle" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} />
                  <Button 
                    size="small" 
                    danger 
                    type="primary" 
                    shape="circle" 
                    icon={<span>X</span>} 
                    style={{ position: 'absolute', top: -5, right: -5 }}
                    onClick={() => setExistingImages(prev => prev.filter((_, i) => i !== idx))}
                  />
                </div>
              ))}
            </div>
          )}
          <Upload.Dragger
            multiple
            listType="picture"
            fileList={fileList}
            onChange={({ fileList }) => setFileList(fileList)}
            beforeUpload={() => false} // Prevent auto-upload
          >
            <p className="ant-upload-drag-icon">
              <UploadCloud size={48} color="#94a3b8" />
            </p>
            <p className="ant-upload-text">Click or drag images to this area to upload</p>
            <p className="ant-upload-hint">Support for a single or bulk upload. Strictly prohibit from uploading company data or other band files</p>
          </Upload.Dragger>
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" size="large" block loading={loading} style={{ marginTop: '1rem', background: '#0f172a' }}>
            {initialData ? 'Update Sales Listing' : 'Publish Sales Listing'}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default AddVehicleSale;
