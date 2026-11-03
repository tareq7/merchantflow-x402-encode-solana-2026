/**
 * Read-only, public verification of MerchantFlow's Nov 2, 2026 x402 devnet payment.
 * This script never loads a wallet, signs a transaction, or spends anything.
 * Run: node service/scripts/verify-devnet-x402-proof.mjs
 */
const expected={
  genesis:"EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG",
  network:"solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
  transaction:"Gj8WB6fGmb3QQya3egcQBNDdMK2L6efhDL8cLukMXZc5MdAAfwAdadfKKrSRXKju9FoT125QgYg4nqYn6TbzFvA",
  mint:"4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  buyer:"Eh7aZUfqSdzeT3MoFozkB2my236yiJqRqe916cJa53Za",
  merchant:"Ev7owEPQLDn3LEsd6uPPakxNVU6dVk5syN2BDjob6LhQ",
  buyerATA:"9sNouueeCcZw6Zx3qM1sESJNZqmtpKFC8z9JgzZ9HpzX",
  merchantATA:"DGXtE2iekWP2h78DuBJWp68C1NhowTCv3reDVNAUXYPs",
  feePayer:"CKPKJWNdJEqa81x7CkZ14BVPiY6y16Sxs7owznqtWYp5",
  splTokenProgram:"TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  amount:10000n
};
const rpcUrl="https://api.devnet.solana.com";
function requireCondition(value,message){if(!value)throw new Error(message);}
async function rpc(method,params=[]){
  requireCondition(["getGenesisHash","getSignatureStatuses","getTransaction"].includes(method),"Unsupported RPC read");
  const response=await fetch(rpcUrl,{method:"POST",redirect:"error",signal:AbortSignal.timeout(10000),
    headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method,params})});
  requireCondition(response.ok,method+" HTTP "+response.status);
  const data=await response.json();
  requireCondition(data && data.error===undefined && data.result!=null,method+" returned error");
  return data.result;
}
function balanceAt(tokenBalances, keys, ata, owner){
  requireCondition(Array.isArray(tokenBalances),"Missing token balances");
  const accountIndex=keys.findIndex(k=>k.pubkey===ata);
  requireCondition(accountIndex>=0,"Pinned token-account address missing from transaction");
  const rows=tokenBalances.filter(b=>b.accountIndex===accountIndex&&b.owner===owner&&
    b.mint===expected.mint&&b.programId===expected.splTokenProgram);
  requireCondition(rows.length===1,"Missing or ambiguous pinned token-account balance");
  const a=rows[0].uiTokenAmount;
  requireCondition(a.decimals===6&&typeof a.amount==="string"&&/^(0|[1-9][0-9]*)$/.test(a.amount),"Malformed token amount");
  return BigInt(a.amount);
}
async function main(){
  requireCondition(await rpc("getGenesisHash")===expected.genesis,"Wrong Solana cluster");
  const statuses=await rpc("getSignatureStatuses",[[expected.transaction],{searchTransactionHistory:true}]);
  const status=statuses?.value?.[0];
  requireCondition(status?.confirmationStatus==="finalized"&&status.err===null,"Transaction not finalized");
  const transaction=await rpc("getTransaction",[expected.transaction,{encoding:"jsonParsed",commitment:"finalized",maxSupportedTransactionVersion:0}]);
  requireCondition(transaction.meta?.err===null,"On-chain transaction error");
  requireCondition(transaction.transaction?.signatures?.includes(expected.transaction),"Transaction signature mismatch");
  const keys=transaction.transaction.message.accountKeys;
  requireCondition(keys[0]?.pubkey===expected.feePayer&&keys[0]?.signer===true,"Unexpected transaction fee payer");
  requireCondition(Number.isSafeInteger(transaction.meta.fee)&&transaction.meta.fee>0,"Invalid network fee");
  const transfers=transaction.transaction.message.instructions.filter(ix=>{
    const info=ix.parsed?.info;
    return ix.program==="spl-token"&&ix.parsed?.type==="transferChecked"&&
      info?.authority===expected.buyer&&info?.source===expected.buyerATA&&
      info?.destination===expected.merchantATA&&info?.mint===expected.mint&&
      info?.tokenAmount?.amount===expected.amount.toString()&&info?.tokenAmount?.decimals===6;
  });
  requireCondition(transfers.length===1,"Exact 0.01 test-USDC transfer instruction missing");
  const beforeBuyer=balanceAt(transaction.meta.preTokenBalances,keys,expected.buyerATA,expected.buyer);
  const afterBuyer=balanceAt(transaction.meta.postTokenBalances,keys,expected.buyerATA,expected.buyer);
  const beforeMerchant=balanceAt(transaction.meta.preTokenBalances,keys,expected.merchantATA,expected.merchant);
  const afterMerchant=balanceAt(transaction.meta.postTokenBalances,keys,expected.merchantATA,expected.merchant);
  requireCondition(beforeBuyer-afterBuyer===expected.amount,"Buyer balance delta differs from payment");
  requireCondition(afterMerchant-beforeMerchant===expected.amount,"Merchant balance delta differs from payment");
  console.log(JSON.stringify({verified:true,chain:"Solana Devnet",transaction:expected.transaction,
    slot:transaction.slot,finalized:true,amountBaseUnits:expected.amount.toString(),mint:expected.mint,
    buyerBefore:beforeBuyer.toString(),buyerAfter:afterBuyer.toString(),
    merchantBefore:beforeMerchant.toString(),merchantAfter:afterMerchant.toString(),
    feePayer:expected.feePayer,networkFeeLamports:transaction.meta.fee,
    note:"Read-only proof of the finalized chain transfer between pinned token accounts, not independent canonical ATA derivation or HTTP status. HTTP 200 and PAYMENT-RESPONSE were separately observed during localhost integration."
  },null,2));
}
try{await main()}catch(error){console.error("Verification FAILED:",error?.message??"unknown");process.exitCode=1}
