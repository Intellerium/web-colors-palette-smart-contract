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

    it("Should set the right owner", async function () {
      const { wcp, owner } = await loadFixture(deployWebColorsPaletteFixture);

      expect(await wcp.owner()).to.equal(owner.address);
    });

    it("Should returns correct version of palette", async function () {
      const { wcp } = await loadFixture(deployWebColorsPaletteFixture);

      expect(await wcp.version()).to.equal(1);
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

    describe("Change position", function () {
      it("Should not revert bouth items owned", async function () {
        const { wcp } = await loadFixture(deployWebColorsPaletteFixture);
        await expect(wcp.changePositions(0xffffff, 0x000000)).not.to.be
          .rejected;
      });

      it("Should swap positions by owner of first item", async function () {
        const { wcp } = await loadFixture(deployWebColorsPaletteFixture);

        await wcp.changePositions(0xffffff, 0x000000);

        const { x: fx, y: fy } = await wcp.positionOf(0xffffff);
        expect(fx).to.eq(0);
        expect(fy).to.eq(1);
      });

      it("Should emint change positions event", async function () {
        const { wcp, owner } = await loadFixture(deployWebColorsPaletteFixture);

        await expect(wcp.changePositions(0xffffff, 0x000000))
          .to.emit(wcp, "ChangePositions")
          .withArgs(owner.address, 0xffffff, 0x000000);
      });

      it("Should chage version after swap positions", async function () {
        const { wcp } = await loadFixture(deployWebColorsPaletteFixture);

        expect(await wcp.version()).to.eq(1);

        await wcp.changePositions(0xffffff, 0x000000);

        expect(await wcp.version()).to.eq(2);
      });

      it("Should swop positions by owner of second item", async function () {
        const { wcp } = await loadFixture(deployWebColorsPaletteFixture);

        await wcp.changePositions(0xffffff, 0x000000);

        const { x: fx, y: fy } = await wcp.positionOf(0x000000);
        expect(fx).to.eq(0);
        expect(fy).to.eq(0);
      });

      it("Should not swap positions by owner of second item", async function () {
        const { wcp, account1 } = await loadFixture(
          deployWebColorsPaletteFixture
        );

        await expect(wcp.connect(account1).changePositions(0xffffff, 0x000000))
          .to.be.reverted;
      });

      it("Should change possition after transfer", async function () {
        const { wcp, owner, account1 } = await loadFixture(
          deployWebColorsPaletteFixture
        );

        await wcp.transferFrom(owner.address, account1.address, 0xffffff);
        await wcp.transferFrom(owner.address, account1.address, 0x000000);

        await expect(wcp.connect(account1).changePositions(0xffffff, 0x000000))
          .not.to.be.reverted;
      });

      it("Should not change possition after transfer from old account", async function () {
        const { wcp, owner, account1 } = await loadFixture(
          deployWebColorsPaletteFixture
        );

        await wcp.transferFrom(owner.address, account1.address, 0xffffff);
        await wcp.transferFrom(owner.address, account1.address, 0x000000);

        await expect(wcp.changePositions(0xffffff, 0x000000)).to.be.reverted;
      });
    });

    describe("Approve charge possition", function () {
      it("Should approve", async function () {
        const { wcp, account1 } = await loadFixture(
          deployWebColorsPaletteFixture
        );

        await expect(wcp.approveOfChangePositions(account1.address, 0xffffff))
          .not.to.be.reverted;
        expect(await wcp.getApprovedOfChangePositions(0xffffff)).to.eq(
          account1.address
        );
      });

      it("Should emit approve event", async function () {
        const { wcp, owner, account1 } = await loadFixture(
          deployWebColorsPaletteFixture
        );

        await expect(wcp.approveOfChangePositions(account1.address, 0xffffff))
          .to.emit(wcp, "ApprovalOfChangePositions")
          .withArgs(owner.address, account1.address, 0xffffff);
      });

      it("Should not approve", async function () {
        const { wcp, account1 } = await loadFixture(
          deployWebColorsPaletteFixture
        );

        await expect(
          wcp
            .connect(account1)
            .approveOfChangePositions(account1.address, 0xffffff)
        ).to.be.reverted;
      });

      it("Should not approve to another account", async function () {
        const { wcp, account1, account2 } = await loadFixture(
          deployWebColorsPaletteFixture
        );

        await expect(
          wcp
            .connect(account1)
            .approveOfChangePositions(account2.address, 0xffffff)
        ).to.be.reverted;
      });

      it("Should change position after approve", async function () {
        const { wcp, owner, account1, account2 } = await loadFixture(
          deployWebColorsPaletteFixture
        );

        const { x: x1, y: y1 } = await wcp.positionOf(0x000000);
        expect(x1).to.eq(0);
        expect(y1).to.eq(1);

        const { x: x2, y: y2 } = await wcp.positionOf(0xffffff);
        expect(x2).to.eq(0);
        expect(y2).to.eq(0);

        await wcp.transferFrom(owner.address, account1.address, 0xffffff);
        await wcp.transferFrom(owner.address, account2.address, 0x000000);

        await wcp
          .connect(account1)
          .approveOfChangePositions(account2.address, 0xffffff);

        await expect(wcp.changePositions(0x000000, 0xffffff)).to.be.reverted;
        await expect(wcp.changePositions(0xffffff, 0x000000)).to.be.reverted;
        await expect(wcp.connect(account1).changePositions(0x000000, 0xffffff))
          .to.be.reverted;

        await wcp.connect(account2).changePositions(0x000000, 0xffffff);

        const { x: x3, y: y3 } = await wcp.positionOf(0x000000);
        expect(x3).to.eq(0);
        expect(y3).to.eq(0);

        const { x: x4, y: y4 } = await wcp.positionOf(0xffffff);
        expect(x4).to.eq(0);
        expect(y4).to.eq(1);
      });
    });
  });
});
