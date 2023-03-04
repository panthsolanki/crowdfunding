import './App.css';
import idl from './idl.json';
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { Program, AnchorProvider, web3, utils, BN } from "@project-serum/anchor";
import { useEffect, useState } from 'react';
import { Buffer } from "buffer";

window.Buffer = Buffer;
const programID = new PublicKey(idl.metadata.address);
const network = clusterApiUrl("devnet");
const opts = {
  preflightCommitment: "processed",
}
const { SystemProgram } = web3;

const App = () => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [campaigns, setCampaigns] = useState([])
  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment)
    const provider = new AnchorProvider(connection, window.solana, opts.preflightCommitment)
    return provider;
  }

  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;
      if (solana) {
        if (solana.isPhantom) {
          console.log('Phantom wallet found!');
          const response = await solana.connect({
            onlyIfTrusted: true,
          });
          console.log('response ==>', response);
          setWalletAddress(response.publicKey.toString())
        }
      } else {
        alert("Solana object not found! Get some Phantom wallet")
      }
    } catch (error) {
      console.log(error);
    }
  };

  const connectWallet = async () => {
    const { solana } = window;
    if (solana) {
      const response = await solana.connect();
      console.log('response ==>', response);
      setWalletAddress(response.publicKey.toString());
    } else {
      alert("Solana object not found! Get some Phantom wallet")
    }
  };

  const getCampaigns = async () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = getProvider();
    const program = new Program(idl, programID, provider);
    Promise.all(
      (await connection.getProgramAccounts(programID)).map(
        async (campaign) => ({
          ...(await program.account.campaign.fetch(campaign.pubkey)),
          pubkey: campaign.pubkey,
        })
      )
    ).then((campaigns) => setCampaigns(campaigns));
  };

  const createCampaign = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const [campaign] = await PublicKey.findProgramAddress(
        [
          utils.bytes.utf8.encode("CAMPAIGN_DEMO"),
          provider.wallet.publicKey.toBuffer(),
        ],
        program.programId
      );
      await program.rpc.create("campaign name", "campaign description", {
        accounts: {
          campaign,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId
        },
      });
      console.log("Create a new campaign with address ", campaign.toString());
    } catch (error) {
      console.log('Error creating campaign account ', error);
    }
  };

  const donate = async (publicKey) => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      await program.rpc.donate(new BN(0.02 * web3.LAMPORTS_PER_SOL), {
        accounts: {
          campaign: publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
      })
      console.log("Donate some money to ", publicKey.toString());
      getCampaigns();
    } catch (error) {
      console.log('Error creating campaign account ', error);
    }
  };

  const renderConnectedWallet = () => {
    return <>
      <button onClick={createCampaign}>Create Campaign</button>
      <button onClick={getCampaigns}>Get Campaigns</button>
      <br />
      {campaigns.map((campaign, index) => (<div key={index}>
        <p>Campaign ID: {campaign.pubkey.toString()}</p>
        <p>Balance: {(campaign.amountDonated / web3.LAMPORTS_PER_SOL).toString()}</p>
        <p>{campaign.name}</p>
        <p>{campaign.description}</p>
        <br />
        <button onClick={() => donate(campaign.pubkey)}>Click to Donate</button>
      </div>))}
      <br />
    </>
  };

  const renderNotConnectedWallet = () => {
    return <button onClick={connectWallet}>Connect to Wallet</button>
  };

  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    }
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return (<div className='App'>
    <h1>your wallet address: {walletAddress} </h1>
    {!walletAddress && renderNotConnectedWallet()}
    {walletAddress && renderConnectedWallet()}
  </div>)
}

export default App;
