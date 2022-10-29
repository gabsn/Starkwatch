#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { CdkStack } from "../lib/cdk-stack";
import * as dotenv from 'dotenv' 

dotenv.config()

const app = new cdk.App();
new CdkStack(app, "CdkStack", {
  env: {
    account: "382003673244",
    region: "us-east-1",
  },
});
