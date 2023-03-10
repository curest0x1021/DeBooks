import * as spl_token from "@solana/spl-token";
import * as web3 from "@solana/web3.js";
import * as metadata from "./Metadata";

interface TokenType {
  mint: string;
  name: string;
  uri: string;
  nft: boolean;
  logo_uri: string;
}

export interface WorkType {
  success: boolean;
  key: string;
  signature: string;
  timestamp: number;
  description: string;
  account_keys: string[];
  token_name: string;
  type: string;
  amount: number | null;
  usd_amount: number | null;
  slot: number;
  fee: number | null;
  mint: string;
  uri: string;
  logo_uri: string;
}

export interface UtlType {
  address: string;
  chainId: number;
  name: string;
  symbol: string;
  verified: boolean;
  decimals: number;
  holders: number | null;
  logoURI: string;
  tags: string[];
  extensions: { coingeckoId: string } | undefined;
}

const SOL_MINT = "So11111111111111111111111111111111111111112";
const SOL_LOGO_URI = `https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/${SOL_MINT}/logo.png`;

let connection: web3.Connection;
let fetchedList: TokenType[] = [];

export async function classifyTransaction(
  cnx: web3.Connection,
  item: web3.ParsedTransactionWithMeta,
  workingArray: WorkType[],
  showMetadata: boolean,
  programIDs: string[],
  account_index: number,
  keyIn: string,
  utl: UtlType[]
) {
  //new fee item
  connection = cnx;
  const feePayer: string = item.transaction.message.accountKeys[0].pubkey.toBase58();
  let fee_context = "";
  let txn_context = " Transaction ";
  if (item.meta && item.meta.err === null) {
    // does it involve my wallet? to add
    // check all instruction accounts flatmapped
    let customDescripton = "";
    let txn_type = "Generic";
    if (
      programIDs.includes("JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB") ||
      programIDs.includes("JUP3c2Uh3WA4Ng34tw6kPd2G4C5BB21Xo36Je1s32Ph") ||
      programIDs.includes("JUP2jxvXaqu7NQY1GmNF4m1vodw12LVXYxbFL2uJvfo") ||
      programIDs.includes("JUP6i4ozu5ydDCnLiMogSckDPpbtr7BJ4FtzYWkb5Rk")
    ) {
      customDescripton = "Jup.ag";
      txn_type = "Swap";
    }
    // Magic Eden V2
    else if (programIDs.includes("M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K")) {
      // Search for NFT names upfront becasue we know its Magic Eden
      txn_type = "Marketplace";
      if (item.meta.logMessages) {
        if (
          (item.meta.logMessages[1].includes(" Sell") && item.meta.logMessages[6]?.includes(" ExecuteSale")) ||
          (item.meta.logMessages[1].includes(" Sell") && item.meta.logMessages[12]?.includes(" ExecuteSale"))
        ) {
          //fee_context = " Make Offer"
          fee_context = " Sale via Offer ";
          txn_context = " Sale via Offer ";
        } else if (item.meta.logMessages[1].includes(" Buy")) {
          if (item.meta.innerInstructions && item.meta.innerInstructions.length > 0) {
            fee_context = " Make Offer ";
            txn_context = " Make Offer ";
          } else {
            fee_context = " Adjust Offer ";
          }
        } else if (item.meta.logMessages[1].includes(" Sell")) {
          txn_context = " Listed ";
          fee_context = " Listed ";
        } else if (
          item.meta.logMessages[12]?.includes(" ExecuteSale") ||
          item.meta.logMessages[14]?.includes(" ExecuteSale")
        ) {
          txn_context = " Sale ";
          fee_context = " Sale ";
        } else if (item.meta.logMessages[1].includes(" CancelSell")) {
          txn_context = " Delisted ";
          fee_context = " Delisted ";
        } else if (item.meta.logMessages[1].includes(" CancelBuy")) {
          txn_context = " Cancel Offer ";
          fee_context = " Cancel Offer ";
        } else if (item.meta.logMessages[1].includes(" Withdraw")) {
          txn_context = " Withdraw ";
          fee_context = " Withdraw ";
        } else if (item.meta.logMessages[1].includes(" Deposit")) {
          txn_context = " Deposit ";
          fee_context = " Deposit ";
        }
      }
      customDescripton = "Magic Eden";
    }
    //hadeswap
    else if (programIDs.includes("hadeK9DLv9eA7ya5KCTqSvSvRZeJC3JgD5a9Y3CNbvu")) {
      customDescripton = "Hadeswap";
      txn_type = "AMM";
      if (item.meta.logMessages) {
        if (item.meta.logMessages[1].includes("BuyNftFromPair")) {
          txn_context = " Purchase ";
          fee_context = "";
        } else if (item.meta.logMessages[1].includes("SellNftToLiquidityPair")) {
          txn_context = " Sell ";
          fee_context = "";
        } else if (item.meta.logMessages[1].includes("DepositLiquidityToPair")) {
          txn_context = " Deposit Liquidity ";
          fee_context = "";
        } else if (item.meta.logMessages[1].includes("WithdrawLiquidityFromBuyOrdersPair")) {
          txn_context = " Withdraw Liquidity ";
          fee_context = "";
        } else if (item.meta.logMessages[1].includes("WithdrawLiquidityFromBalancedPair")) {
          txn_context = " Withdraw Liquidity ";
          fee_context = "";
        } else if (item.meta.logMessages[1].includes("WithdrawLiquidityOrderVirtualFees")) {
          txn_context = " Withdraw Fees ";
          fee_context = "";
        } else if (item.meta.logMessages[1].includes("InitializePair")) {
          txn_context = " Initialize Pair ";
          fee_context = "";
        } else if (item.meta.logMessages[5].includes("ModifyPair")) {
          txn_context = " Modify Pair ";
          fee_context = "";
        }
      }
    }
    //hadeswap
    else if (programIDs.includes("trsMRg3GzFSNgC3tdhbuKUES8YvGtUBbzp5fjxLtVQW")) {
      customDescripton = "Hyperspace | Cardinal";
      txn_type = "Marketplace";
      if (item.meta.logMessages) {
        if (item.meta.logMessages[22].includes("AcceptListing")) {
          txn_context = " Purchase ";
          fee_context = "";
        } else if (item.meta.logMessages[1].includes("CreateListing")) {
          txn_context = " Create Listing ";
          fee_context = "";
        } else if (item.meta.logMessages[1].includes("UpdateListing")) {
          txn_context = " Update Listing ";
          fee_context = "";
        }
      }
    }
    //Foxy Swap
    else if (programIDs.includes("8guzmt92HbM7yQ69UJg564hRRX6N4nCdxWE5L6ENrA8P")) {
      customDescripton = "FoxySwap";
      txn_type = "Swap";
      if (item.meta.logMessages) {
        for (const value of item.meta.logMessages) {
          if (value.includes("InitSwap")) {
            try {
              txn_context =
                " Initiate Swap " + item.transaction.message.accountKeys[1].pubkey.toBase58().substring(0, 4) + " - ";
              fee_context = "";

              break;
            } catch (e) {
              console.log("Error init swap", item.transaction.signatures);
              console.log(e);
            }
          } else if (value.includes("CompleteSwap")) {
            try {
              txn_context =
                " Complete Swap " +
                (item.transaction.message.instructions[0] as web3.PartiallyDecodedInstruction).accounts[0]
                  .toBase58()
                  .substring(0, 4) +
                " - ";
              fee_context = "";
              break;
            } catch (e) {
              console.log("Error complete swap", item.transaction.signatures);
              console.log(e);
            }
          } else if (value.includes("CancelSwap")) {
            try {
              txn_context =
                " Cancel Swap " +
                (item.transaction.message.instructions[0] as web3.PartiallyDecodedInstruction).accounts[0]
                  .toBase58()
                  .substring(0, 4) +
                " - ";
              fee_context = "";
              break;
            } catch (e) {
              console.log("Error complete swap", item.transaction.signatures);
              console.log(e);
            }
          }
        }
      }
    }
    //YAWWW Swap
    else if (programIDs.includes("1RzgwLNLcLXCnK6eiev5jPmEP6TyJbmkTtvN6NShvXy")) {
      customDescripton = "YAWWW";
      txn_type = "Swap";
      if (item.meta.logMessages) {
        for (const value of item.meta.logMessages) {
          if (value.includes("Initialize swap")) {
            try {
              txn_context =
                " Initiate Swap " +
                (item.transaction.message.instructions[1] as web3.PartiallyDecodedInstruction).accounts[1]
                  .toBase58()
                  .substring(0, 4) +
                " -";
              break;
            } catch (e) {
              console.log("Error init yaw swap", item.transaction.signatures);
              console.log(e);
            }
          } else if (value.includes("Send swap item to counterparty")) {
            try {
              txn_context =
                " Complete Swap " +
                (item.transaction.message.instructions[1] as web3.PartiallyDecodedInstruction).accounts[1]
                  .toBase58()
                  .substring(0, 4) +
                " - ";
              break;
            } catch (e) {
              console.log("Error complete  ywaee swap", item.transaction.signatures);
              console.log(e);
            }
          } else if (value.includes("Cancel swap")) {
            try {
              txn_context =
                " Cancel Swap " +
                (item.transaction.message.instructions[0] as web3.PartiallyDecodedInstruction).accounts[2]
                  .toBase58()
                  .substring(0, 4) +
                " - ";
              break;
            } catch (e) {
              console.log("Error cancel yaww swap", item.transaction.signatures);
              console.log(e);
            }
          }
        }
      }
    }
    //YAWWW Loan
    else if (programIDs.includes("76f9QiXhCc8YLJc2LEE4Uae4Xu3itc3JCGLmup3VQwRH")) {
      customDescripton = "YAWWW Loan";
      txn_type = "Loan";
      if (item.meta.logMessages) {
        for (const value of item.meta.logMessages) {
          if (value.includes("Create loan request")) {
            try {
              txn_context =
                " Initiate Loan request " +
                (item.transaction.message.instructions[5] as web3.PartiallyDecodedInstruction).accounts[5]
                  .toBase58()
                  .substring(0, 4) +
                " -";
              break;
            } catch (e) {
              console.log("Error init loan", item.transaction.signatures);
              console.log(e);
            }
          } else if (value.includes("Cancel loan request")) {
            try {
              txn_context =
                " Cancel Loan request " +
                (item.transaction.message.instructions[1] as web3.PartiallyDecodedInstruction).accounts[3]
                  .toBase58()
                  .substring(0, 4) +
                " -";
              break;
            } catch (e) {
              console.log("Error cancel loan", item.transaction.signatures);
              console.log(e);
            }
          } else if (value.includes("Create loan offer")) {
            try {
              txn_context =
                " Create Loan offer " +
                (item.transaction.message.instructions[0] as web3.PartiallyDecodedInstruction).accounts[1]
                  .toBase58()
                  .substring(0, 4) +
                " -";
              break;
            } catch (e) {
              console.log("Error cancel loan", item.transaction.signatures);
              console.log(e);
            }
          } else if (value.includes("Cancel loan offer")) {
            try {
              txn_context =
                " Cancel Loan offer " +
                (item.transaction.message.instructions[0] as web3.PartiallyDecodedInstruction).accounts[1]
                  .toBase58()
                  .substring(0, 4) +
                " -";
              break;
            } catch (e) {
              console.log("Error cancel loan", item.transaction.signatures);
              console.log(e);
            }
          } else if (value.includes("Pay loan back")) {
            try {
              txn_context =
                " Loan Repaid " +
                (item.transaction.message.instructions[1] as web3.PartiallyDecodedInstruction).accounts[3]
                  .toBase58()
                  .substring(0, 4) +
                " -";
              break;
            } catch (e) {
              console.log("Error repay loan", item.transaction.signatures);
              console.log(e);
            }
          } else if (value.includes("Accept loan request")) {
            try {
              if (feePayer === keyIn) {
                txn_context =
                  " Lend Out " +
                  (item.transaction.message.instructions[0] as web3.PartiallyDecodedInstruction).accounts[2]
                    .toBase58()
                    .substring(0, 4) +
                  " -";
                break;
              } else {
                txn_context =
                  " Receive Loan " +
                  (item.transaction.message.instructions[0] as web3.PartiallyDecodedInstruction).accounts[2]
                    .toBase58()
                    .substring(0, 4) +
                  " -";
                break;
              }
            } catch (e) {
              console.log("Error complete swap", item.transaction.signatures);
              console.log(e);
            }
          } else if (value.includes("Claim loan collateral")) {
            try {
              customDescripton =
                " YAWWW Collateral Claimed " +
                (item.transaction.message.instructions[0] as web3.PartiallyDecodedInstruction).accounts[1]
                  .toBase58()
                  .substring(0, 4) +
                " -";
              break;
            } catch (e) {
              console.log("Error complete swap", item.transaction.signatures);
              console.log(e);
            }
          }
        }
      }
    }
    //other generic searching
    else {
      if (item.meta.logMessages) {
        for (const value of item.meta.logMessages) {
          try {
            if (value.toLowerCase().includes(" stake") || value.toLowerCase().includes(" staking")) {
              customDescripton = "Stake";
              txn_type = "Stake";
              break;
            } else if (value.toLowerCase().includes(" unstake") || value.toLowerCase().includes(" unstaking")) {
              customDescripton = "Unstake";
              txn_type = "Stake";
              break;
            } else if (value.toLowerCase().includes(" claim") || value.toLowerCase().includes(" claiming")) {
              customDescripton = "Claim";
              break;
            } else if (value.toLowerCase().includes(" burn")) {
              customDescripton = "Burn";
              txn_type = "Burn";
              break;
            }
          } catch (e) {
            console.log("error in generic text search");
          }
        }
      }
    }
    //check the pre and post; if any owner is undefined then find it and set it;
    const preTokens = item.meta.preTokenBalances ?? [];
    const postTokens = item.meta.postTokenBalances ?? [];

    for await (const token of preTokens) {
      if (token.owner === undefined) {
        //find owner and set it - old transactions don't have this data
        //console.log("looking for owner pre tokens")
        try {
          const owner = await connection.getAccountInfoAndContext(
            item.transaction.message.accountKeys[token.accountIndex].pubkey
          );
          if (owner.value?.owner.toBase58() === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") {
            //SPL token
            //get ultimate owner
            const decoded = spl_token.AccountLayout.decode(owner.value.data);
            const uowner = decoded.owner.toBase58();
            token.owner = uowner;
          }
        } catch (e) {
          console.log(e);
        }
      }
    }
    for await (const token of postTokens) {
      if (token.owner === undefined) {
        //find owner and set it
        //console.log("looking for owner post tokens")
        try {
          const owner = await connection.getAccountInfoAndContext(
            item.transaction.message.accountKeys[token.accountIndex].pubkey
          );
          if (owner.value?.owner.toBase58() === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") {
            //SPL token
            //get ultimate owner
            const decoded = spl_token.AccountLayout.decode(owner.value.data);
            const uowner = decoded.owner.toBase58();
            token.owner = uowner;
          }
        } catch (e) {
          console.log(e);
        }
      }
    }

    const preFiltered = preTokens.filter((token) => token.owner === keyIn);
    const postFiltered = postTokens.filter((token) => token.owner === keyIn);

    const combined = [...preFiltered.flatMap((s) => s.mint), ...postFiltered.flatMap((s) => s.mint)];
    const uniqueTokens = combined.filter((v, i, a) => a.indexOf(v) === i);
    //console.log("Unique tokens ", combined,  uniqueTokens)
    //token balance loop

    for await (const uniqueToken of uniqueTokens) {
      let decimals = preTokens.filter((line) => line.mint === uniqueToken)[0]?.uiTokenAmount.decimals;
      if (decimals === undefined) {
        decimals = postFiltered.filter((line) => line.mint === uniqueToken)[0]?.uiTokenAmount.decimals;
      }
      const preFil = preTokens.filter((token) => token.owner === keyIn && token.mint === uniqueToken)[0]?.uiTokenAmount
        .uiAmount;
      const postFil = postTokens.filter((token) => token.owner === keyIn && token.mint === uniqueToken)[0]
        ?.uiTokenAmount.uiAmount;
      let created = false;
      let closed = false;
      let preBal;
      let postBal;

      if (preFil) {
        preBal = preFil;
      } else {
        preBal = 0;
        created = true;
      }

      if (postFil) {
        postBal = postFil;
      } else {
        postBal = 0;
        closed = true;
      }
      // = preFil? preFil : 0
      // = postFil? postFil : 0

      let tokenChange = parseFloat((postBal - preBal).toFixed(decimals));

      const preIndex = preTokens.filter((token) => token.owner === keyIn && token.mint === uniqueToken)[0]
        ?.accountIndex;
      const postIndex = postTokens.filter((token) => token.owner === keyIn && token.mint === uniqueToken)[0]
        ?.accountIndex;
      //need to find the SOL balance change of the wrapped sol account
      if (uniqueToken === SOL_MINT) {
        if (postIndex) {
          tokenChange = item.meta
            ? (item.meta.postBalances[postIndex] - item.meta.preBalances[postIndex]) / web3.LAMPORTS_PER_SOL
            : 0;
        } else if (preIndex) {
          tokenChange = item.meta
            ? (item.meta.postBalances[preIndex] - item.meta.preBalances[preIndex]) / web3.LAMPORTS_PER_SOL
            : 0;
          //console.log("NaN? ", amount, account_index)
        }
      } else {
        //recognise sol balance change in a sub-account
        let amount = 0;
        let accountSuffix = "";
        if (postIndex) {
          amount = item.meta
            ? (item.meta.postBalances[postIndex] - item.meta.preBalances[postIndex]) / web3.LAMPORTS_PER_SOL
            : 0;
          accountSuffix = item.transaction.message.accountKeys[postIndex]?.pubkey.toBase58();
        } else if (preIndex) {
          amount = item.meta
            ? (item.meta.postBalances[preIndex] - item.meta.preBalances[preIndex]) / web3.LAMPORTS_PER_SOL
            : 0;
          accountSuffix = item.transaction.message.accountKeys[preIndex]?.pubkey.toBase58();
          //console.log("NaN? ", amount, account_index)
        }
        const subacccontext = created ? "created " : "" + closed ? "closed " : "";
        if (amount != 0) {
          const direction = amount < 0 ? "Out: " : "In: ";
          const new_line: WorkType = {
            signature: item.transaction.signatures[0],
            key: keyIn,
            timestamp: item.blockTime ?? 0,
            slot: item.slot,
            success: item.meta?.err === null ? true : false,
            fee: item.meta ? item.meta.fee : null,
            amount: amount,
            usd_amount: null,
            mint: SOL_MINT,
            token_name: "SOL",
            uri: "",
            logo_uri: SOL_LOGO_URI,
            type: txn_type,
            account_keys: item.transaction.message.accountKeys.flatMap((k) => k.pubkey.toBase58()),
            description:
              customDescripton +
              txn_context +
              direction +
              " SOL" +
              " (" +
              subacccontext +
              "sub-account " +
              accountSuffix.substring(0, 4) +
              ")",
          };
          workingArray.push(new_line);

          //console.log("SOL", new_line, (item.meta.postBalances[account_index] - item.meta.preBalances[account_index])/web3.LAMPORTS_PER_SOL,(item.meta.postBalances[account_index] - item.meta.preBalances[account_index] + item.meta.fee)/web3.LAMPORTS_PER_SOL )

          //console.log(new_line)
        }
      }
      //not sure this has to be a feepayer token?
      if (tokenChange != 0) {
        //console.log("--> unique token ", uniqueToken)
        const direction = tokenChange < 0 ? "Out: " : "In: ";
        //console.log("--> unique token ", tokenName.symbol? )
        const tokenName = await fetchTokenData([uniqueToken], utl, showMetadata);
        const new_line: WorkType = {
          signature: item.transaction.signatures[0],
          key: keyIn,
          timestamp: item.blockTime ?? 0,
          slot: item.slot,
          success: item.meta?.err === null ? true : false,
          fee: item.meta ? item.meta.fee : null,
          amount: tokenChange,
          usd_amount: null,
          mint: uniqueToken,
          token_name: tokenName.name,
          uri: tokenName.uri,
          logo_uri: tokenName.logo_uri,
          type: txn_type,
          account_keys: item.transaction.message.accountKeys.flatMap((k) => k.pubkey.toBase58()),
          description: customDescripton + txn_context + direction + tokenName.name,
        };
        workingArray.push(new_line);
        //console.log(new_line, decimals)
      }
    }

    //SOL balance sort
    if (account_index != -1) {
      let amount = 0;
      if (feePayer === keyIn) {
        amount = item.meta
          ? (item.meta.postBalances[account_index] - item.meta.preBalances[account_index] + item.meta.fee) /
            web3.LAMPORTS_PER_SOL
          : 0;
      } else {
        amount = item.meta
          ? (item.meta.postBalances[account_index] - item.meta.preBalances[account_index]) / web3.LAMPORTS_PER_SOL
          : 0;
        //console.log("NaN? ", amount, account_index)
      }

      if (amount != 0) {
        const direction = amount < 0 ? "Out: " : "In: ";

        const new_line: WorkType = {
          signature: item.transaction.signatures[0],
          key: keyIn,
          timestamp: item.blockTime ?? 0,
          slot: item.slot,
          success: item.meta?.err === null ? true : false,
          fee: item.meta ? item.meta.fee : null,
          amount: amount,
          usd_amount: null,
          mint: SOL_MINT,
          token_name: "SOL",
          uri: "",
          logo_uri: SOL_LOGO_URI,
          type: txn_type,
          account_keys: item.transaction.message.accountKeys.flatMap((k) => k.pubkey.toBase58()),
          description: customDescripton + txn_context + direction + " SOL",
        };
        workingArray.push(new_line);

        //console.log("SOL", new_line, (item.meta.postBalances[account_index] - item.meta.preBalances[account_index])/web3.LAMPORTS_PER_SOL,(item.meta.postBalances[account_index] - item.meta.preBalances[account_index] + item.meta.fee)/web3.LAMPORTS_PER_SOL )

        //console.log(new_line)
      }
    }

    //find balances of key in?
    //let account_index = item.transaction.message.accountKeys.flatMap(s => s.pubkey.toBase58()).indexOf(keyIn)
    //fee expense
    if (feePayer === keyIn) {
      const failed_text = item.meta.err != null ? " Failed txn" : "";

      const fee_expense: WorkType = {
        signature: item.transaction.signatures[0],
        key: keyIn,
        timestamp: item.blockTime ?? 0,
        slot: item.slot,
        success: true,
        fee: item.meta ? item.meta.fee / web3.LAMPORTS_PER_SOL : null,
        amount: item.meta ? -item.meta.fee / web3.LAMPORTS_PER_SOL : null,
        usd_amount: null,
        mint: SOL_MINT,
        token_name: "SOL",
        uri: "",
        logo_uri: SOL_LOGO_URI,
        type: "Fees",
        account_keys: item.transaction.message.accountKeys.flatMap((k) => k.pubkey.toBase58()),
        description: "Txn fees: " + customDescripton + fee_context + failed_text,
      };
      workingArray.push(fee_expense);
      //console.log("fee paid by user", fee_expense)
    }
  } else {
    if (feePayer === keyIn) {
      //failed txn
      const fee_expense: WorkType = {
        signature: item.transaction.signatures[0],
        key: keyIn,
        timestamp: item.blockTime ?? 0,
        slot: item.slot,
        success: true,
        fee: item.meta ? item.meta.fee / web3.LAMPORTS_PER_SOL : null,
        amount: item.meta ? -item.meta.fee / web3.LAMPORTS_PER_SOL : null,
        usd_amount: null,
        mint: SOL_MINT,
        token_name: "SOL",
        uri: "",
        logo_uri: SOL_LOGO_URI,
        type: "Fees",
        account_keys: item.transaction.message.accountKeys.flatMap((k) => k.pubkey.toBase58()),
        description: "Txn fees: failed",
      };
      workingArray.push(fee_expense);
      //console.log("fee paid by user", fee_expense)
    }
  }
}

async function fetchTokenData(mintsIn: string[], utl: UtlType[], showMetadata: boolean): Promise<TokenType> {
  let namedToken: TokenType = { mint: "", name: "Unknown Token ", uri: "", nft: false, logo_uri: "" };
  if (mintsIn.length === 1) {
    if (showMetadata) {
      const existingIndex = fetchedList.flatMap((s) => s.mint).indexOf(mintsIn[0]);
      if (existingIndex != -1) {
        namedToken = fetchedList[existingIndex];
        //console.log("found existing mint ",fetchedList[existingIndex], existingIndex)
        return namedToken;
      }

      //let utlToken:Token = await utl.fetchMint(new web3.PublicKey(mintIn))
      const utlToken = utl.filter((item) => item.address === mintsIn[0])[0];
      if (utlToken === null || utlToken === undefined) {
        try {
          const nftnames = await metadata.getTokenMetadata(new web3.PublicKey(mintsIn[0]));
          if (nftnames) {
            if (nftnames?.name != "") {
              const add_item: TokenType = {
                mint: mintsIn[0],
                name: nftnames.name,
                uri: nftnames.uri,
                nft: true,
                logo_uri: "",
              };
              namedToken = add_item;
              fetchedList.push(add_item);
              //console.log("1", nftnames)
            } else if (nftnames.symbol != "" && nftnames.uri != "") {
              const response = await fetch(nftnames.uri);
              const data = await response.json();
              //already have image link here
              const add_item: TokenType = {
                mint: mintsIn[0],
                name: data.name,
                uri: nftnames.uri,
                nft: true,
                logo_uri: "",
              };
              namedToken = add_item;
              fetchedList.push(add_item);
              //console.log("2", nftnames, data)
            }
          }
        } catch {
          console.log("ERROR1 - Could not find token name for: ", mintsIn[0]);
        }
      } else {
        const add_item: TokenType = {
          mint: mintsIn[0],
          name: utlToken.symbol,
          uri: "",
          nft: false,
          logo_uri: utlToken.logoURI,
        };
        fetchedList.push(add_item);
        namedToken = add_item;
      }
    } else {
      const add_item: TokenType = {
        mint: mintsIn[0],
        name: "Unknown Token " + mintsIn[0].substring(0, 4),
        uri: "",
        nft: false,
        logo_uri: "",
      };
      namedToken = add_item;
    }
  }
  //have not attended to multiple mints
  else if (mintsIn.length > 1) {
    for await (const mint of mintsIn) {
      if (showMetadata) {
        const existingIndex = fetchedList.flatMap((s) => s.mint).indexOf(mint);
        if (existingIndex != -1) {
          //console.log("found existing mint ",fetchedList[existingIndex], existingIndex)
          namedToken.name = namedToken.name + " " + fetchedList[existingIndex].name;
        }
        //let utlToken:Token = await utl.fetchMint(new web3.PublicKey(mintIn))
        const utlToken = utl.filter((item) => item.address === mint)[0];
        if (utlToken === null || utlToken === undefined) {
          try {
            const nftnames = await metadata.getTokenMetadata(new web3.PublicKey(mint));
            //console.log(mintIn, nftnames)
            if (nftnames) {
              if (nftnames.name != "") {
                const add_item: TokenType = {
                  mint: mint,
                  name: nftnames.name,
                  uri: nftnames.uri,
                  nft: true,
                  logo_uri: "",
                };
                fetchedList.push(add_item);
                namedToken.name = namedToken.name + " " + nftnames.name;
                //console.log("1", nftnames)
              } else if (nftnames.symbol != "" && nftnames.uri != "") {
                const response = await fetch(nftnames.uri);
                const data = await response.json();
                const add_item: TokenType = {
                  mint: mint,
                  name: data.name,
                  uri: data.uri,
                  nft: true,
                  logo_uri: "",
                };
                fetchedList.push(add_item);
                namedToken.name = namedToken.name + " " + data.name;
                //console.log("2", data)
              }
            }
          } catch {
            console.log("ERROR2 - Could not find token name for: ", mint);
          }
        } else {
          const add_item: TokenType = {
            mint: mint,
            name: utlToken.symbol,
            uri: "",
            nft: false,
            logo_uri: utlToken.logoURI,
          };
          fetchedList.push(add_item);
          namedToken.name = namedToken.name + " " + utlToken.symbol;
        }
      } else {
        namedToken.name = namedToken.name + " " + mint.substring(0, 4);
      }
    }
  }

  return namedToken;
}
