import * as React from 'react';
import styled from 'styled-components';

import Web3Modal from 'web3modal';
// @ts-ignore
import WalletConnectProvider from '@walletconnect/web3-provider';
import Column from './components/Column';
import Wrapper from './components/Wrapper';
import Header from './components/Header';
import Loader from './components/Loader';
import ConnectButton from './components/ConnectButton';
import Button from './components/Button';

import { Web3Provider } from '@ethersproject/providers';
import { getChainData } from './helpers/utilities';

import { ERC721_MINT_NFT } from './constants';
import { getContract } from './helpers/ethers';
import MyNFT2 from './constants/abis/MyNFT2.json';

const SLayout = styled.div`
	position: relative;
	width: 100%;
	min-height: 100vh;
	text-align: center;
`;

const SContent = styled(Wrapper)`
	width: 100%;
	height: 100%;
	padding: 0 16px;
`;

const SContainer = styled.div`
	height: 100%;
	min-height: 200px;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	word-break: break-word;
`;

const SLanding = styled(Column)`
	height: 600px;
`;

// @ts-ignore
const SBalances = styled(SLanding)`
	height: 100%;
	& h3 {
		padding-top: 30px;
	}
`;

const Form = styled.form`
	color: rgb(12, 12, 13);
	display: block;
	width: 300px;
	margin: 50px auto;
`;

const Input = styled.input`
	padding: 0.5em;
	color: rgb(12, 12, 13);
	background: #eee;
	border: none;
	border-radius: 3px;
	width: 100%;
	margin-bottom: 0.5em;
`;

interface IAppState {
	fetching: boolean;
	address: string;
	library: any;
	connected: boolean;
	chainId: number;
	pendingRequest: boolean;
	result: any | null;
	mintContract: any | null;
	info: any | null;
	addressTo: string;
	uri: string;
}

const INITIAL_STATE: IAppState = {
	fetching: false,
	address: '',
	library: null,
	connected: false,
	chainId: 1,
	pendingRequest: false,
	result: null,
	mintContract: null,
	info: null,
	addressTo: '',
	uri: '',
};

class App extends React.Component<any, any> {
	// @ts-ignore
	public web3Modal: Web3Modal;
	public state: IAppState;
	public provider: any;

	constructor(props: any) {
		super(props);
		this.state = {
			...INITIAL_STATE,
		};

		this.web3Modal = new Web3Modal({
			network: this.getNetwork(),
			cacheProvider: true,
			providerOptions: this.getProviderOptions(),
		});
	}

	public componentDidMount() {
		if (this.web3Modal.cachedProvider) {
			this.onConnect();
		}
	}

	public onConnect = async () => {
		this.provider = await this.web3Modal.connect();

		const library = new Web3Provider(this.provider);

		const network = await library.getNetwork();

		const address = this.provider.selectedAddress
			? this.provider.selectedAddress
			: this.provider.accounts[0];

		const mintContract = getContract(
			ERC721_MINT_NFT,
			MyNFT2.abi,
			library,
			address
		);

		await this.setState({
			library,
			chainId: network.chainId,
			address,
			connected: true,
			mintContract,
		});

		await this.subscribeToProviderEvents(this.provider);
	};

	public subscribeToProviderEvents = async (provider: any) => {
		if (!provider.on) {
			return;
		}

		provider.on('accountsChanged', this.changedAccount);
		provider.on('networkChanged', this.networkChanged);
		provider.on('close', this.close);

		await this.web3Modal.off('accountsChanged');
	};

	public async unSubscribe(provider: any) {
		// Workaround for metamask widget > 9.0.3 (provider.off is undefined);
		window.location.reload(false);
		if (!provider.off) {
			return;
		}

		provider.off('accountsChanged', this.changedAccount);
		provider.off('networkChanged', this.networkChanged);
		provider.off('close', this.close);
	}

	public changedAccount = async (accounts: string[]) => {
		if (!accounts.length) {
			// Metamask Lock fire an empty accounts array
			await this.resetApp();
		} else {
			await this.setState({ address: accounts[0] });
		}
	};

	public networkChanged = async (networkId: number) => {
		const library = new Web3Provider(this.provider);
		const network = await library.getNetwork();
		const chainId = network.chainId;
		await this.setState({ chainId, library });
	};

	public close = async () => {
		this.resetApp();
	};

	public getNetwork = () => getChainData(this.state.chainId).network;

	public getProviderOptions = () => {
		const providerOptions = {
			walletconnect: {
				package: WalletConnectProvider,
				options: {
					infuraId: process.env.REACT_APP_INFURA_ID,
				},
			},
		};
		return providerOptions;
	};

	public resetApp = async () => {
		await this.web3Modal.clearCachedProvider();
		localStorage.removeItem('WEB3_CONNECT_CACHED_PROVIDER');
		localStorage.removeItem('walletconnect');
		await this.unSubscribe(this.provider);

		this.setState({ ...INITIAL_STATE });
	};

	public handleAddressToChange = (e: any) => {
		this.setState({ addressTo: e.target.value });
	};

	public handleUriChange = (e: any) => {
		this.setState({ uri: e.target.value });
	};

	public onMintNFT = async (e: any) => {
		e.preventDefault();
		const { mintContract } = this.state;

		// tslint:disable-next-line:no-console
		console.log(this.state.addressTo);

		await this.setState({ fetching: true });
		const transaction = await mintContract.safeMint(
			this.state.addressTo,
			this.state.uri
		);

		await this.setState({ transactionHash: transaction.hash });

		const transactionReceipt = await transaction.wait();
		if (transactionReceipt.status !== 1) {
			// React to failure
		}
	};

	public render = () => {
		const {
			address,
			connected,
			chainId,
			fetching,
			addressTo,
			uri,
		} = this.state;
		return (
			<SLayout>
				<Column maxWidth={1000} spanHeight>
					<Header
						connected={connected}
						address={address}
						chainId={chainId}
						killSession={this.resetApp}
					/>
					<SContent>
						{fetching ? (
							<Column center>
								<SContainer>
									<Loader />
								</SContainer>
							</Column>
						) : (
							<SLanding center>
								{!this.state.connected && (
									<ConnectButton onClick={this.onConnect} />
								)}
								{this.state.connected && (
									<SContainer>
										<Form>
											<Input
												name='addressTo'
												type='text'
												placeholder='Address to send to:'
												value={addressTo}
												onChange={this.handleAddressToChange}
											/>
											<Input
												name='uri'
												type='text'
												placeholder='Token URI:'
												value={uri}
												onChange={this.handleUriChange}
											/>
											<Button onClick={this.onMintNFT}>MINT NFT</Button>
										</Form>
									</SContainer>
								)}
							</SLanding>
						)}
					</SContent>
				</Column>
			</SLayout>
		);
	};
}

export default App;
