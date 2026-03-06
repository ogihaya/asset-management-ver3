import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { MessagingResource } from '../../lib/resource/messaging-resource';

describe('MessagingResource', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let messagingResource: MessagingResource;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');
    
    messagingResource = new MessagingResource(stack, 'TestMessaging', {
      topicName: 'test-topic',
      queueName: 'test-queue',
      dlqName: 'test-dlq',
    });

    template = Template.fromStack(stack);
  });

  describe('SNS Topic', () => {
    it('should create an SNS topic', () => {
      template.resourceCountIs('AWS::SNS::Topic', 1);
    });

    it('should export topic property', () => {
      expect(messagingResource.topic).toBeDefined();
    });

    it('should have correct display name', () => {
      template.hasResourceProperties('AWS::SNS::Topic', {
        DisplayName: 'test-topic',
      });
    });
  });

  describe('SQS Queue', () => {
    it('should create a main queue', () => {
      template.resourceCountIs('AWS::SQS::Queue', 2); // Main + DLQ
    });

    it('should export queue property', () => {
      expect(messagingResource.queue).toBeDefined();
    });

    it('should have visibility timeout configured', () => {
      // Default visibility timeout is 30 seconds
      template.hasResourceProperties('AWS::SQS::Queue', {
        VisibilityTimeout: 30,
      });
    });
  });

  describe('Dead Letter Queue', () => {
    it('should create a DLQ', () => {
      expect(messagingResource.deadLetterQueue).toBeDefined();
    });

    it('should configure redrive policy', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        RedrivePolicy: {
          deadLetterTargetArn: {
            'Fn::GetAtt': Match.anyValue(),
          },
          maxReceiveCount: 3,
        },
      });
    });
  });

  describe('SNS to SQS Subscription', () => {
    it('should subscribe queue to topic', () => {
      template.resourceCountIs('AWS::SNS::Subscription', 1);
    });

    it('should use SQS protocol', () => {
      template.hasResourceProperties('AWS::SNS::Subscription', {
        Protocol: 'sqs',
      });
    });
  });

  describe('Queue Policy', () => {
    it('should create a queue policy', () => {
      template.resourceCountIs('AWS::SQS::QueuePolicy', 1);
    });

    it('should allow SNS to send messages', () => {
      template.hasResourceProperties('AWS::SQS::QueuePolicy', {
        PolicyDocument: {
          Statement: [
            {
              Action: 'sqs:SendMessage',
              Effect: 'Allow',
              Principal: {
                Service: 'sns.amazonaws.com',
              },
            },
          ],
        },
      });
    });
  });
});

