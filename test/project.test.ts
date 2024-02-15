// tslint:disable-next-line no-implicit-dependencies
import { assert } from "chai";
import { config } from "dotenv";
import path from "path";

import { useEnvironment } from "./helpers";
config();

const ALCHEMY = process.env.ALCHEMY;

describe("Hardhat Runtime Environment extension", function () {
  describe("Decode task", function () {
    useEnvironment("hardhat-project");

    it("works", async function () {
      await this.hre.run("compile");
      await this.hre.run("decode", {
        data: "0xd6c04f27",
      });
    });
  });

  describe("Deploy task", function () {
    useEnvironment("hardhat-project");

    it("works", async function () {
      await this.hre.run("compile");
      await this.hre.run("deploy", {
        trace: true,
      });
    });
  });

  describe("Run script", function () {
    useEnvironment("hardhat-project");

    it("works", async function () {
      await this.hre.run("compile");
      await this.hre.run("run", { script: "scripts/deploy.ts", trace: true });
    });
  });

  describe("Test task", function () {
    useEnvironment("hardhat-project");

    // before(async function () {
    //   await this.hre.run("compile");
    // });

    it("works", async function () {
      await this.hre.run("compile");
      await this.hre.run("test", {
        traceError: true,
        opcodes: "MSTORE,MLOAD,MSIZE",
      });
    });
  });

  describe("Trace task", function () {
    useEnvironment("hardhat-project");

    before(async function () {
      // await this.hre.run("compile");
    });

    it("Should be enabled when specified in config", function () {
      assert.strictEqual(this.hre.tracer.enabled, true);
    });

    it("mainnet by rpc", async function () {
      await this.hre.run("trace", {
        hash:
          "0xc645204e28ffc9f75812e598c6ee7a959c501756062195b2f0fb003276fa39a7",
        // "0x23f7eb343fe541517cd7829763c46eca12c2987b4a2449d244babca77a72cf71",
        rpc: "https://eth-mainnet.alchemyapi.io/v2/" + ALCHEMY,
        v: true,
        // opcodes: ["SSTORE", "SLOAD"].join(","),
        print: "json",
        // nocompile: true,
      });
    });

    it("mainnet by network", async function () {
      await this.hre.run("trace", {
        hash:
          "0xc7f743c1bcd7fddfd6b644f6e5a3a97bdf5a02dfdff180a79f79f7c7481a5b0f",
        network: "mainnet",
      });
    });

    it.skip("arbitrum", async function () {
      await this.hre.run("trace", {
        hash:
          "0x582c18de13bb3c5068f6f8bd0e60f86be8e224ad351a0c3414e7c94aa975841f",
        rpc: "https://arb-mainnet.g.alchemy.com/v2/" + ALCHEMY,
      });
    });
  });

  describe("Trace call", function () {
    useEnvironment("hardhat-project");

    before(async function () {
      // await this.hre.run("compile");
    });

    it("Should be enabled when specified in config", function () {
      assert.strictEqual(this.hre.tracer.enabled, true);
    });

    it("mainnet by rpc", async function () {
      await this.hre.run("compile");
      await this.hre.run("tracecall", {
        to: "0xe592427a0aece92de3edee1f18e0157c05861564",
        data:
          "0x414bf389000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000001f40000000000000000000000000f4ee9631f4be0a63756515141281a3e2b293bbe00000000000000000000000000000000000000000000000000000000627e90ee000000000000000000000000000000000000000000000003244c2a6bb0dc44220000000000000000000000000000000000000000000000000000001be27dca0d0000000000000000000000000000000000000000000000000000000000000000",
        opcodes: "SSTORE,SLOAD",
        blocknumber: "14768585",
        rpc: "https://arb-mainnet.g.alchemy.com/v2/" + ALCHEMY,
      });
    });

    it("mainnet by network", async function () {
      await this.hre.run("compile");
      await this.hre.run("tracecall", {
        to: "0xe592427a0aece92de3edee1f18e0157c05861564",
        data:
          "0x414bf389000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000001f40000000000000000000000000f4ee9631f4be0a63756515141281a3e2b293bbe00000000000000000000000000000000000000000000000000000000627e90ee000000000000000000000000000000000000000000000003244c2a6bb0dc44220000000000000000000000000000000000000000000000000000001be27dca0d0000000000000000000000000000000000000000000000000000000000000000",
        opcodes: "SSTORE,SLOAD",
        blocknumber: "14768585",
        network: "mainnet",
      });
    });

    it("arbitrum", async function () {
      await this.hre.run("tracecall", {
        to: "0x4521916972a76d5bfa65fb539cf7a0c2592050ac",
        data:
          "0xce4c18de00000000000000000000000000000000000000000000000000000000a913a04f",
        rpc: "https://arb-mainnet.g.alchemy.com/v2/" + ALCHEMY,
      });
    });
  });

  describe("hardhat-deploy", function () {
    useEnvironment("hardhat-project");
    it("deploy should not fail", async function () {
      await this.hre.run("deploy");
    });
  });
});
