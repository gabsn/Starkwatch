import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as path from "path";
import { Duration, RemovalPolicy } from "aws-cdk-lib";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import * as apigateway from 'aws-cdk-lib/aws-apigateway';


export class CdkStack extends cdk.Stack {
  table: cdk.aws_dynamodb.Table;
  fetchLambda: cdk.aws_lambda_nodejs.NodejsFunction;
  sendLambda: cdk.aws_lambda_nodejs.NodejsFunction;
  receiveLambda: cdk.aws_lambda_nodejs.NodejsFunction;
  api: cdk.aws_apigateway.RestApi;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.setupTable();
    this.setupFetcher();
    this.setupSender();
    this.setupReceiver();
    this.table.grantFullAccess(this.fetchLambda);
    this.setupApiGateway();
  }

  setupApiGateway() {
    this.api = new apigateway.RestApi(this, 'api', {
      // description: 'example api gateway',
      // deployOptions: {
      //   stageName: 'dev',
      // },
      // // 👇 enable CORS
      // defaultCorsPreflightOptions: {
      //   allowHeaders: [
      //     'Content-Type',
      //     'X-Amz-Date',
      //     'Authorization',
      //     'X-Api-Key',
      //   ],
      //   allowMethods: ['OPTIONS', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      //   allowCredentials: true,
      //   allowOrigins: ['http://localhost:3000'],
      // },
    });
    new cdk.CfnOutput(this, 'apiUrl', {value: this.api.url});

    const commands = this.api.root.addResource('commands')
    commands.addMethod(
      'POST',
      new apigateway.LambdaIntegration(this.receiveLambda)
    )
    
  }



  setupTable() {
    this.table = new Table(this, "TransactionStatus", {
      partitionKey: {
        name: "transactionHash",
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
    });
  }

  setupFetcher() {
    this.fetchLambda = new NodejsFunction(this, "Fetcher", {
      timeout: Duration.seconds(40),
      memorySize: 256,
      entry: path.resolve(__dirname, "../functions/fetcher.ts"),
      runtime: Runtime.NODEJS_16_X,
      logRetention: RetentionDays.ONE_WEEK,
      bundling: {
        minify: true,
        externalModules: ["aws-sdk"],
      },
    });
    const eventRule = new events.Rule(this, "scheduleRule", {
      schedule: events.Schedule.rate(Duration.minutes(1)),
    });
    eventRule.addTarget(new targets.LambdaFunction(this.fetchLambda));
  }

  setupSender() {
    this.sendLambda = new NodejsFunction(this, "Sender", {
      timeout: Duration.seconds(40),
      memorySize: 256,
      entry: path.resolve(__dirname, "../functions/sender.ts"),
      runtime: Runtime.NODEJS_16_X,
      logRetention: RetentionDays.ONE_WEEK,
      bundling: {
        minify: true,
        externalModules: ["aws-sdk"],
      },
      environment: {
        BOT_API_KEY: getFromEnv("BOT_API_KEY"),
        API_GATEWAY_URL: getFromEnv("API_GATEWAY_URL"),
      }
    });
    const eventRule = new events.Rule(this, "sendRule", {
      schedule: events.Schedule.rate(Duration.minutes(1)),
    });
    eventRule.addTarget(new targets.LambdaFunction(this.sendLambda));
  }

  setupReceiver() {
    this.receiveLambda = new NodejsFunction(this, "Receiver", {
      timeout: Duration.seconds(40),
      memorySize: 256,
      entry: path.resolve(__dirname, "../functions/receiver.ts"),
      runtime: Runtime.NODEJS_16_X,
      logRetention: RetentionDays.ONE_WEEK,
      bundling: {
        minify: true,
        externalModules: ["aws-sdk"],
      },
      environment: {
        BOT_API_KEY: getFromEnv("BOT_API_KEY"),
        API_GATEWAY_URL: getFromEnv("API_GATEWAY_URL"),
      }
    });

  }


}


export function getFromEnv(key: string) {
  const value = process.env[key];
  if (value === undefined) {
    throw new Error("Variable not defined in environment");
  }
  return value;
  }