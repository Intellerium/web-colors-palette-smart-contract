import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

const BASE_METADATA_URI = "http:\\\\localhost:3000\\";

describe("WebColorsPalette", function () {
  async function deployWebColorsPaletteFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, account1, account2] = await ethers.getSigners();

    const ProxyRegistry = await ethers.getContractFactory("ProxyRegistry");
    const proxy = await ProxyRegistry.deploy();

    const WebColorsPalette = await ethers.getContractFactory(
      "WebColorsPalette"
    );
    const wcp = await WebColorsPalette.deploy(proxy.address);

    return { wcp, owner, account1, account2 };
  }

  describe("Deployment", function () {
    it("Should returns balance 7 for owner and 0 for other", async function () {
      const { wcp, owner, account1, account2 } = await loadFixture(
        deployWebColorsPaletteFixture
      );

      expect(await wcp.balanceOf(owner.address)).to.equal(7);
      expect(await wcp.balanceOf(account1.address)).to.equal(0);
      expect(await wcp.balanceOf(account2.address)).to.equal(0);
    });

    it("Should returns correct name", async function () {
      const { wcp } = await loadFixture(deployWebColorsPaletteFixture);

      expect(await wcp.name()).to.equal("Web Colors Palette");
    });

    it("Should returns correct symbol", async function () {
      const { wcp } = await loadFixture(deployWebColorsPaletteFixture);

      expect(await wcp.symbol()).to.equal("WCP");
    });
  });

  describe("Metadata URI", function () {
    it("Should return URL with token id", async function () {
      const { wcp } = await loadFixture(deployWebColorsPaletteFixture);

      expect(await wcp.tokenURI(0xffffff)).to.equal(
        BASE_METADATA_URI + (0xffffff).toString()
      );
      expect(await wcp.tokenURI(0x0000ff)).to.equal(
        BASE_METADATA_URI + (255).toString()
      );
      expect(await wcp.tokenURI(0x00000)).to.equal(
        BASE_METADATA_URI + (0).toString()
      );
    });

    it("Should return URL to palette metadata", async function () {
      const { wcp } = await loadFixture(deployWebColorsPaletteFixture);

      expect(await wcp.contractURI()).to.equal(
        BASE_METADATA_URI + "webcolorspalette"
      );
    });
  });

  describe("Transfers", function () {
    it("Should transfer to first account", async function () {
      const { wcp, owner, account1 } = await loadFixture(
        deployWebColorsPaletteFixture
      );

      expect(await wcp.ownerOf(0xffffff)).to.eq(owner.address);

      await expect(wcp.transferFrom(owner.address, account1.address, 0xffffff))
        .not.to.reverted;
      expect(await wcp.ownerOf(0xffffff)).to.eq(account1.address);
    });

    it("Should revert when transfer from incorrect account", async function () {
      const { wcp, owner, account1 } = await loadFixture(
        deployWebColorsPaletteFixture
      );

      expect(await wcp.ownerOf(0xffffff)).to.eq(owner.address);
      await expect(
        wcp
          .connect(account1)
          .transferFrom(owner.address, account1.address, 0xffffff)
      ).to.be.revertedWith("ERC721: caller is not token owner nor approved");
      expect(await wcp.ownerOf(0xffffff)).to.eq(owner.address);
    });

    it("Should transfer after correct transfer", async function () {
      const { wcp, owner, account1, account2 } = await loadFixture(
        deployWebColorsPaletteFixture
      );

      expect(await wcp.ownerOf(0xffffff)).to.eq(owner.address);
      await expect(wcp.transferFrom(owner.address, account1.address, 0xffffff))
        .not.to.be.reverted;
      expect(await wcp.ownerOf(0xffffff)).to.eq(account1.address);

      await expect(
        wcp.transferFrom(owner.address, account1.address, 0xffffff)
      ).to.be.revertedWith("ERC721: caller is not token owner nor approved");

      await expect(
        wcp
          .connect(account1)
          .transferFrom(account1.address, account2.address, 0xffffff)
      ).not.to.be.reverted;

      expect(await wcp.ownerOf(0xffffff)).to.eq(account2.address);
      await expect(
        wcp
          .connect(account1)
          .transferFrom(account2.address, account1.address, 0xffffff)
      ).to.be.revertedWith("ERC721: caller is not token owner nor approved");
    });
  });

  describe("Positions", function () {
    describe("Default positon", function () {
      it("Should return first position", async function () {
        const { wcp } = await loadFixture(deployWebColorsPaletteFixture);

        const { x, y } = await wcp.positionOf(0xffffff);
        expect(x).to.eq(0);
        expect(y).to.eq(0);
      });

      it("Should return second position", async function () {
        const { wcp } = await loadFixture(deployWebColorsPaletteFixture);

        const { x, y } = await wcp.positionOf(0x000000);
        expect(x).to.eq(0);
        expect(y).to.eq(1);
      });
    });
  });
});
