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
import * as apigateway from "aws-cdk-lib/aws-apigateway";

export class CdkStack extends cdk.Stack {
  fetchLambda: cdk.aws_lambda_nodejs.NodejsFunction;
  sendLambda: cdk.aws_lambda_nodejs.NodejsFunction;
  receiveLambda: cdk.aws_lambda_nodejs.NodejsFunction;
  api: cdk.aws_apigateway.RestApi;
  transactionStatusTable: cdk.aws_dynamodb.Table;
  accountTable: cdk.aws_dynamodb.Table;
  schedulerLambda: cdk.aws_lambda_nodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.setupTransactionTable();
    this.setupAccountTable();

    this.setupFetcher();
    this.setupScheduler();
    this.setupReceiver();
    this.setupApiGateway();

    this.accountTable.grantFullAccess(this.receiveLambda);
    this.accountTable.grantFullAccess(this.schedulerLambda);

    this.transactionStatusTable.grantFullAccess(this.fetchLambda);

    const bus = new events.EventBus(this, "bus", {
      eventBusName: "FetchAccountTxsBus",
    });
    bus.grantPutEventsTo(this.schedulerLambda);
    const eventRule = new events.Rule(this, "fetchAccountTxsRule", {
      eventBus: bus,
      eventPattern: { source: ["focustree.scheduler"] },
    });
    eventRule.addTarget(new targets.LambdaFunction(this.fetchLambda));
  }

  setupApiGateway() {
    this.api = new apigateway.RestApi(this, "api", {});
    new cdk.CfnOutput(this, "apiUrl", { value: this.api.url });

    const commands = this.api.root.addResource("commands");
    commands.addMethod(
      "POST",
      new apigateway.LambdaIntegration(this.receiveLambda)
    );
  }

  setupTransactionTable() {
    this.transactionStatusTable = new Table(this, "TransactionStatus", {
      partitionKey: {
        name: "transactionHash",
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
    });
  }

  setupAccountTable() {
    this.accountTable = new Table(this, "AccountsToWatch", {
      partitionKey: {
        name: "accountAddress",
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
    });
    this.accountTable.addGlobalSecondaryIndex({
      indexName: "byUsername",
      partitionKey: {
        name: "username",
        type: AttributeType.STRING,
      },
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
      environment: {
        BOT_API_KEY: getFromEnv("BOT_API_KEY"),
        ACCOUNT_TABLE: this.accountTable.tableName,
        TX_STATUSES_TABLE: this.transactionStatusTable.tableName,
      },
    });
  }

  setupScheduler() {
    this.schedulerLambda = new NodejsFunction(this, "Scheduler", {
      timeout: Duration.seconds(40),
      memorySize: 256,
      entry: path.resolve(__dirname, "../functions/scheduler.ts"),
      runtime: Runtime.NODEJS_16_X,
      logRetention: RetentionDays.ONE_WEEK,
      bundling: {
        minify: true,
        externalModules: ["aws-sdk"],
      },
      environment: {
        BOT_API_KEY: getFromEnv("BOT_API_KEY"),
        ACCOUNT_TABLE: this.accountTable.tableName,
        TX_STATUSES_TABLE: this.transactionStatusTable.tableName,
      },
    });
    const eventRule = new events.Rule(this, "schedulerRule", {
      schedule: events.Schedule.rate(Duration.minutes(1)),
    });
    eventRule.addTarget(new targets.LambdaFunction(this.schedulerLambda));
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
        ACCOUNT_TABLE: this.accountTable.tableName,
        TX_STATUSES_TABLE: this.transactionStatusTable.tableName,
      },
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
