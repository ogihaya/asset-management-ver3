import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { ApiResource } from '../../lib/resource/api-resource';

describe('ApiResource', () => {
  describe('With Lambda Configuration', () => {
    let app: cdk.App;
    let stack: cdk.Stack;
    let vpc: ec2.Vpc;
    let apiResource: ApiResource;
    let template: Template;

    beforeEach(() => {
      app = new cdk.App();
      stack = new cdk.Stack(app, 'TestStack', {
        env: { account: '123456789012', region: 'ap-northeast-1' },
      });
      vpc = new ec2.Vpc(stack, 'TestVpc', { maxAzs: 2 });

      apiResource = new ApiResource(stack, 'TestApi', {
        lambdaFunctionName: 'test-lambda',
        apiGatewayName: 'test-api',
        ecsClusterName: 'test-cluster',
        ecsServiceName: 'test-service',
        albName: 'test-alb',
        vpc,
        lambdaConfig: {
          memorySize: 512,
          timeout: 30,
        },
      });

      template = Template.fromStack(stack);
    });

    describe('Lambda Function', () => {
      it('should create a Lambda function', () => {
        template.resourceCountIs('AWS::Lambda::Function', 1);
      });

      it('should export lambdaFunction property', () => {
        expect(apiResource.lambdaFunction).toBeDefined();
      });

      it('should export lambdaSecurityGroup property', () => {
        expect(apiResource.lambdaSecurityGroup).toBeDefined();
      });
    });

    describe('API Gateway', () => {
      it('should create an API Gateway', () => {
        template.resourceCountIs('AWS::ApiGateway::RestApi', 1);
      });

      it('should export apiGateway property', () => {
        expect(apiResource.apiGateway).toBeDefined();
      });

      it('should have Lambda integration', () => {
        template.hasResourceProperties('AWS::ApiGateway::Method', {
          HttpMethod: 'GET',
          Integration: Match.objectLike({
            Type: 'AWS_PROXY',
          }),
        });
      });
    });
  });

  describe('Without Lambda Configuration', () => {
    let app: cdk.App;
    let stack: cdk.Stack;
    let vpc: ec2.Vpc;
    let apiResource: ApiResource;
    let template: Template;

    beforeEach(() => {
      app = new cdk.App();
      stack = new cdk.Stack(app, 'TestStack', {
        env: { account: '123456789012', region: 'ap-northeast-1' },
      });
      vpc = new ec2.Vpc(stack, 'TestVpc', { maxAzs: 2 });

      apiResource = new ApiResource(stack, 'TestApi', {
        lambdaFunctionName: 'test-lambda',
        apiGatewayName: 'test-api',
        ecsClusterName: 'test-cluster',
        ecsServiceName: 'test-service',
        albName: 'test-alb',
        vpc,
        // No lambdaConfig - Lambda and API Gateway should not be created
      });

      template = Template.fromStack(stack);
    });

    it('should not create a Lambda function', () => {
      template.resourceCountIs('AWS::Lambda::Function', 0);
    });

    it('should not create an API Gateway', () => {
      template.resourceCountIs('AWS::ApiGateway::RestApi', 0);
    });

    it('should have undefined lambdaFunction property', () => {
      expect(apiResource.lambdaFunction).toBeUndefined();
    });

    it('should have undefined apiGateway property', () => {
      expect(apiResource.apiGateway).toBeUndefined();
    });
  });

  describe('ECS Cluster', () => {
    let template: Template;
    let apiResource: ApiResource;

    beforeEach(() => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStack', {
        env: { account: '123456789012', region: 'ap-northeast-1' },
      });
      const vpc = new ec2.Vpc(stack, 'TestVpc', { maxAzs: 2 });

      apiResource = new ApiResource(stack, 'TestApi', {
        lambdaFunctionName: 'test-lambda',
        apiGatewayName: 'test-api',
        ecsClusterName: 'test-cluster',
        ecsServiceName: 'test-service',
        albName: 'test-alb',
        vpc,
      });

      template = Template.fromStack(stack);
    });

    it('should create an ECS cluster', () => {
      template.resourceCountIs('AWS::ECS::Cluster', 1);
    });

    it('should export ecsCluster property', () => {
      expect(apiResource.ecsCluster).toBeDefined();
    });

    it('should have correct cluster name', () => {
      template.hasResourceProperties('AWS::ECS::Cluster', {
        ClusterName: 'test-cluster',
      });
    });
  });

  describe('ECS Task Definition', () => {
    let template: Template;

    beforeEach(() => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStack', {
        env: { account: '123456789012', region: 'ap-northeast-1' },
      });
      const vpc = new ec2.Vpc(stack, 'TestVpc', { maxAzs: 2 });

      new ApiResource(stack, 'TestApi', {
        lambdaFunctionName: 'test-lambda',
        apiGatewayName: 'test-api',
        ecsClusterName: 'test-cluster',
        ecsServiceName: 'test-service',
        albName: 'test-alb',
        vpc,
      });

      template = Template.fromStack(stack);
    });

    it('should create a Fargate task definition', () => {
      template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        RequiresCompatibilities: ['FARGATE'],
      });
    });

    it('should have correct CPU and memory', () => {
      template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        Cpu: '256',
        Memory: '512',
      });
    });

    it('should have container definition', () => {
      template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        ContainerDefinitions: Match.arrayWith([
          Match.objectLike({
            Name: 'app',
            PortMappings: Match.arrayWith([
              Match.objectLike({
                ContainerPort: 8000, // FastAPI のデフォルトポート
                Protocol: 'tcp',
              }),
            ]),
          }),
        ]),
      });
    });
  });

  describe('ECS Service', () => {
    let template: Template;
    let apiResource: ApiResource;

    beforeEach(() => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStack', {
        env: { account: '123456789012', region: 'ap-northeast-1' },
      });
      const vpc = new ec2.Vpc(stack, 'TestVpc', { maxAzs: 2 });

      apiResource = new ApiResource(stack, 'TestApi', {
        lambdaFunctionName: 'test-lambda',
        apiGatewayName: 'test-api',
        ecsClusterName: 'test-cluster',
        ecsServiceName: 'test-service',
        albName: 'test-alb',
        vpc,
      });

      template = Template.fromStack(stack);
    });

    it('should create an ECS service', () => {
      template.resourceCountIs('AWS::ECS::Service', 1);
    });

    it('should export ecsService property', () => {
      expect(apiResource.ecsService).toBeDefined();
    });

    it('should use Fargate launch type', () => {
      template.hasResourceProperties('AWS::ECS::Service', {
        LaunchType: 'FARGATE',
      });
    });
  });

  describe('Application Load Balancer', () => {
    let template: Template;
    let apiResource: ApiResource;

    beforeEach(() => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStack', {
        env: { account: '123456789012', region: 'ap-northeast-1' },
      });
      const vpc = new ec2.Vpc(stack, 'TestVpc', { maxAzs: 2 });

      apiResource = new ApiResource(stack, 'TestApi', {
        lambdaFunctionName: 'test-lambda',
        apiGatewayName: 'test-api',
        ecsClusterName: 'test-cluster',
        ecsServiceName: 'test-service',
        albName: 'test-alb',
        vpc,
      });

      template = Template.fromStack(stack);
    });

    it('should create an ALB', () => {
      template.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 1);
    });

    it('should export alb property', () => {
      expect(apiResource.alb).toBeDefined();
    });

    it('should have correct name', () => {
      template.hasResourceProperties(
        'AWS::ElasticLoadBalancingV2::LoadBalancer',
        {
          Name: 'test-alb',
        }
      );
    });

    it('should be internet-facing', () => {
      template.hasResourceProperties(
        'AWS::ElasticLoadBalancingV2::LoadBalancer',
        {
          Scheme: 'internet-facing',
        }
      );
    });

    it('should create HTTP listener', () => {
      template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
        Port: 80,
        Protocol: 'HTTP',
      });
    });

    it('should create target group', () => {
      template.resourceCountIs(
        'AWS::ElasticLoadBalancingV2::TargetGroup',
        1
      );
    });
  });

  describe('Security Groups', () => {
    let template: Template;
    let apiResource: ApiResource;

    beforeEach(() => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStack', {
        env: { account: '123456789012', region: 'ap-northeast-1' },
      });
      const vpc = new ec2.Vpc(stack, 'TestVpc', { maxAzs: 2 });

      apiResource = new ApiResource(stack, 'TestApi', {
        lambdaFunctionName: 'test-lambda',
        apiGatewayName: 'test-api',
        ecsClusterName: 'test-cluster',
        ecsServiceName: 'test-service',
        albName: 'test-alb',
        vpc,
      });

      template = Template.fromStack(stack);
    });

    it('should export ecsSecurityGroup property', () => {
      expect(apiResource.ecsSecurityGroup).toBeDefined();
    });

    it('should export albSecurityGroup property', () => {
      expect(apiResource.albSecurityGroup).toBeDefined();
    });

    it('should allow traffic from ALB to ECS', () => {
      template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
        IpProtocol: 'tcp',
        FromPort: 8000, // FastAPI のデフォルトポート
        ToPort: 8000,
        Description: 'Load balancer to target',
      });
    });
  });

  describe('CloudWatch Logs', () => {
    let template: Template;

    beforeEach(() => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStack', {
        env: { account: '123456789012', region: 'ap-northeast-1' },
      });
      const vpc = new ec2.Vpc(stack, 'TestVpc', { maxAzs: 2 });

      new ApiResource(stack, 'TestApi', {
        lambdaFunctionName: 'test-lambda',
        apiGatewayName: 'test-api',
        ecsClusterName: 'test-cluster',
        ecsServiceName: 'test-service',
        albName: 'test-alb',
        vpc,
      });

      template = Template.fromStack(stack);
    });

    it('should create log group for ECS', () => {
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: '/ecs/test-service',
      });
    });

    it('should have retention configured', () => {
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 7,
      });
    });
  });

  describe('Custom Container Image', () => {
    it('should use custom container image when provided', () => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStack', {
        env: { account: '123456789012', region: 'ap-northeast-1' },
      });
      const vpc = new ec2.Vpc(stack, 'TestVpc', { maxAzs: 2 });

      new ApiResource(stack, 'TestApi', {
        lambdaFunctionName: 'test-lambda',
        apiGatewayName: 'test-api',
        ecsClusterName: 'test-cluster',
        ecsServiceName: 'test-service',
        albName: 'test-alb',
        vpc,
        containerImage: ecs.ContainerImage.fromRegistry('custom-image:latest'),
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        ContainerDefinitions: Match.arrayWith([
          Match.objectLike({
            Image: 'custom-image:latest',
          }),
        ]),
      });
    });

    it('should use nginx as default container image', () => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'TestStack', {
        env: { account: '123456789012', region: 'ap-northeast-1' },
      });
      const vpc = new ec2.Vpc(stack, 'TestVpc', { maxAzs: 2 });

      new ApiResource(stack, 'TestApi', {
        lambdaFunctionName: 'test-lambda',
        apiGatewayName: 'test-api',
        ecsClusterName: 'test-cluster',
        ecsServiceName: 'test-service',
        albName: 'test-alb',
        vpc,
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        ContainerDefinitions: Match.arrayWith([
          Match.objectLike({
            Image: 'nginx:latest',
          }),
        ]),
      });
    });
  });
});
