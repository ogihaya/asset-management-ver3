import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { SesTemplateConstruct } from '../../../lib/construct/messaging/ses-template-construct';

describe('SesTemplateConstruct', () => {
  let app: cdk.App;
  let stack: cdk.Stack;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');
  });

  describe('Single template', () => {
    let template: Template;

    beforeEach(() => {
      new SesTemplateConstruct(stack, 'TestSesTemplate', {
        templates: [
          {
            templateName: 'test-welcome',
            subjectPart: 'Welcome {{name}}',
            htmlPart: '<h1>Welcome {{name}}</h1>',
            textPart: 'Welcome {{name}}',
          },
        ],
      });
      template = Template.fromStack(stack);
    });

    it('should create one SES template', () => {
      template.resourceCountIs('AWS::SES::Template', 1);
    });

    it('should have correct template properties', () => {
      template.hasResourceProperties('AWS::SES::Template', {
        Template: {
          TemplateName: 'test-welcome',
          SubjectPart: 'Welcome {{name}}',
          HtmlPart: '<h1>Welcome {{name}}</h1>',
          TextPart: 'Welcome {{name}}',
        },
      });
    });
  });

  describe('Multiple templates', () => {
    let template: Template;

    beforeEach(() => {
      new SesTemplateConstruct(stack, 'TestSesTemplates', {
        templates: [
          {
            templateName: 'welcome',
            subjectPart: 'Welcome',
            htmlPart: '<h1>Welcome</h1>',
          },
          {
            templateName: 'reset-password',
            subjectPart: 'Reset Password',
            textPart: 'Reset your password here.',
          },
        ],
      });
      template = Template.fromStack(stack);
    });

    it('should create two SES templates', () => {
      template.resourceCountIs('AWS::SES::Template', 2);
    });
  });

  describe('Template with html only', () => {
    it('should create template without textPart', () => {
      new SesTemplateConstruct(stack, 'TestHtmlOnly', {
        templates: [
          {
            templateName: 'html-only',
            subjectPart: 'Subject',
            htmlPart: '<p>HTML only</p>',
          },
        ],
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::SES::Template', {
        Template: Match.objectLike({
          TemplateName: 'html-only',
          HtmlPart: '<p>HTML only</p>',
        }),
      });
    });
  });

  describe('Exported properties', () => {
    it('should export templates array', () => {
      const construct = new SesTemplateConstruct(stack, 'TestExport', {
        templates: [
          {
            templateName: 'test',
            subjectPart: 'Test',
          },
        ],
      });
      expect(construct.templates).toBeDefined();
      expect(construct.templates).toHaveLength(1);
    });
  });
});
