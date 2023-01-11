import { useMemo } from 'react';
import { Button, Loader } from '../ui-components/index.js';
import { useNavigate } from 'react-router-dom';
import stakingLogo from '../images/staking_logo.svg';
import yieldLogo from '../images/yield_logo.svg';
import privateShieldLogo from '../images/private_shield_logo.svg';
import privateSendLogo from '../images/private_send_logo.svg';

import aaveLogo from '../images/aave_logo.svg';
import compoundLogo from '../images/compound_logo.svg';
import cowswapLogo from '../images/cowswap_logo.svg';
import defipulseLogo from '../images/defipulse_logo.svg';
import liquityLogo from '../images/liquity_logo.svg';
import mstableLogo from '../images/mstable_logo.svg';
import ribbonLogo from '../images/ribbon_logo.svg';
import setLogo from '../images/set_logo.svg';
import tokemakLogo from '../images/tokemak_logo.svg';
import uniswapLogo from '../images/uniswap_logo.svg';
import privateUnderline from '../images/underline.svg';
import arrow from '../images/arrow.svg';

import privateDefi from '../images/private_defi.svg';
import sendReceive from '../images/send_receive.svg';
import shieldFunds from '../images/shield_funds.svg';

import whyZkMoney1 from '../images/why_zkmoney_1.svg';
import whyZkMoney2 from '../images/why_zkmoney_2.svg';
import whyZkMoney3 from '../images/why_zkmoney_3.svg';

import { Hyperlink, HyperlinkIcon } from '../ui-components/index.js';
import { bindStyle } from '../ui-components/util/classnames.js';
import { DefiCard } from '../components/index.js';
import { DefiRecipe } from '../alt-model/defi/types.js';
import { recipeFiltersToSearchStr } from '../alt-model/defi/recipe_filters.js';
import style from './home.module.scss';

const cx = bindStyle(style);

interface HomeProps {
  onSignup: () => void;
  recipes?: DefiRecipe[];
}

export function Home({ onSignup, recipes }: HomeProps) {
  return (
    <div className={style.homeWrapper}>
      <Banner onShieldNow={onSignup} recipes={recipes} />
      <FavoriteApps />
      <div className={style.section}>
        <div className={style.sectionTitle}>How do I use zk.money?</div>
        <div className={style.steps}>
          <div className={style.step}>
            <div className={style.number}>1</div>
            <div className={style.line} />
            <div className={style.content}>
              <div className={style.title}>Shield funds</div>
              <div className={style.description}>
                Connect your Ethereum wallet to shield funds to Aztec and register an account alias.
              </div>
            </div>
            <img src={shieldFunds} className={style.stepImage} alt="" />
          </div>
          <div className={style.step}>
            <div className={style.number}>2</div>
            <div className={style.line} />
            <div className={style.content}>
              <div className={style.title}>Access private DeFi</div>
              <div className={style.description}>
                Funds can be used to interact with popular DeFi protocols like Element and Lido with full privacy.
              </div>
            </div>
            <img src={privateDefi} className={style.stepImage} alt="" />
          </div>
          <div className={style.step}>
            <div className={style.number}>3</div>
            <div className={style.content}>
              <div className={style.title}>Send and receive privately</div>
              <div className={style.description}>
                Funds within zk.money can be sent fully privately to another Aztec alias or sent to Layer 1. Remember to
                follow privacy best practices!
              </div>
            </div>
            <img src={sendReceive} className={style.stepImage} alt="" />
          </div>
        </div>
      </div>
      <div className={style.section}>
        <div className={style.sectionTitle}>Why zk.money?</div>
        <div className={style.howItWorksWrapper}>
          <img className={cx(style.whyZk, style.whyImage1)} src={whyZkMoney1} alt="" />
          <img className={cx(style.whyZk, style.whyImage2)} src={whyZkMoney2} alt="" />
          <img className={cx(style.whyZk, style.whyImage3)} src={whyZkMoney3} alt="" />
          <div className={style.contentWrapper}>
            <div className={style.content}>
              <div className={style.title}>How does shielding work?</div>
              <div className={style.description}>
                Shielding funds to Aztec creates a private note on Layer 2. Private notes can be traded, staked, and
                used to earn yield just like normal Ethereum assets–but with full privacy protection.
              </div>
            </div>
          </div>
          <div className={style.contentWrapper}>
            <div className={style.content}>
              <div className={style.title}>Privacy by default</div>
              <div className={style.description}>
                Using zk.money means full privacy without having to opt-in. All transactions are default
                privacy-shielded. Learn more about best practices here.
              </div>
            </div>
          </div>
          <div className={style.contentWrapper}>
            <div className={style.content}>
              <div className={style.title}>Up to 100x cost savings</div>
              <div className={style.description}>
                Batched DeFi transactions mean orders of magnitude cost savings over equivalent Layer 1 transactions.
                Splitting gas costs with other DeFi users saves up to 99% on transaction fees.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewCard() {
  return (
    <div className={style.previewCard}>
      <Loader />
    </div>
  );
}

function Banner({ onShieldNow, recipes }: { onShieldNow: () => void; recipes: DefiRecipe[] | undefined }) {
  const navigate = useNavigate();
  const shuffledRecipes = useMemo(() => {
    let uniqueNames: string[] = [];
    if (!recipes) return [];
    return (
      recipes
        // picks one recipe of each project
        .filter(recipe => {
          const isDuplicate = uniqueNames.includes(recipe.projectName);
          if (!isDuplicate) {
            uniqueNames.push(recipe.projectName);
            return true;
          }
          return false;
        })
        // shuffles them
        .map(recipe => ({ recipe, sort: Math.random() }))
        .sort((recipeA, recipeB) => recipeA.sort - recipeB.sort)
        .map(({ recipe }) => recipe)
    );
  }, [recipes]);

  const hasRecipes = shuffledRecipes.length > 0;

  const handleSelectRecipe = (recipe: DefiRecipe) => {
    const filter = recipeFiltersToSearchStr({ project: recipe.projectName });
    navigate(`/earn${filter}`);
  };

  return (
    <div className={style.banner}>
      <div className={style.stack}>
        {hasRecipes ? (
          shuffledRecipes
            ?.slice(0, 3)
            .map((recipe, index) => (
              <DefiCard
                key={recipe.id}
                className={cx(
                  style.defiCard,
                  index === 0 && style.top,
                  index === 1 && style.middle,
                  index === 2 && style.bottom,
                )}
                recipe={recipe}
                onSelect={handleSelectRecipe}
                isLoggedIn={true}
              />
            ))
        ) : (
          <PreviewCard />
        )}
      </div>
      <img src={arrow} className={style.arrow} alt="" />
      <div className={style.text}>
        <div className={style.title}>
          {`The `}
          <span className={style.bold}>
            private <img src={privateUnderline} className={style.underline} alt="Underline" />
          </span>
          DeFi yield aggregator for Ethereum.
        </div>
        <div className={style.subtitle}>
          zk.money is your portal to using Ethereum DeFi services with full privacy and up to 100x cost savings. Shield
          funds to start accessing!
        </div>
        <Button text="Shield Now" onClick={onShieldNow} className={style.shieldButton} />
        <div className={style.links}>
          <Hyperlink
            theme="gradient"
            icon={HyperlinkIcon.Open}
            href="https://old.zk.money"
            label="Looking for old zk.money?"
          />
          <Hyperlink
            theme="gradient"
            icon={HyperlinkIcon.Open}
            href="https://docs.aztec.network/how-aztec-works/faq#what-happens-when-i-shield-a-token"
            label="What is Shielding? Read our FAQ"
          />
        </div>
      </div>
    </div>
  );
}

function FavoriteApps() {
  return (
    <div className={style.section}>
      <div className={style.favoriteAppsWrapper}>
        <div className={style.favoriteApps}>
          <div className={style.sectionTitle}>Your favorite Dapps, made private.</div>
          <div className={style.subtitle}>
            Fixed yield. Liquid staking. Money markets. Trading. The universe of Ethereum DeFi is open to you with
            complete privacy, all via the magic of Aztec Connect.
          </div>
          <div className={style.logos}>
            <img className={style.logo} src={aaveLogo} alt="Aave logo" />
            <img className={style.logo} src={compoundLogo} alt="Compound logo" />
            <img className={style.logo} src={uniswapLogo} alt="Uniswap logo" />
            <img className={style.logo} src={liquityLogo} alt="Liquidity logo" />
            <img className={style.logo} src={defipulseLogo} alt="DeFi Pulse logo" />
            <img className={style.logo} src={ribbonLogo} alt="Ribbon logo" />
            <img className={style.logo} src={mstableLogo} alt="mStable logo" />
            <img className={style.logo} src={cowswapLogo} alt="CowSwap logo" />
            <img className={style.logo} src={setLogo} alt="Set logo" />
            <img className={style.logo} src={tokemakLogo} alt="Tokemak logo" />
          </div>
          <div className={style.boxes}>
            <InfoBoxes />
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoBoxes() {
  return (
    <>
      <div className={style.infoBoxWrapper}>
        <div className={style.sectionTitle}>What do we support?</div>
        <div className={style.infoBox}>
          <div className={style.info}>
            <img className={style.logo} src={stakingLogo} alt="" />
            <span className={style.title}>Staking</span>
            <div className={style.subtitle}>Stake Ether and other assets to earn continuous staking yields.</div>
          </div>
          <div className={style.info}>
            <img className={style.logo} src={yieldLogo} alt="" />
            <span className={style.title}>Fixed Yield</span>
            <div className={style.subtitle}>Earn reliable fixed yields on funds deposited to Aztec.</div>
          </div>
        </div>
      </div>
      <div className={style.infoBoxWrapper}>
        <div className={style.sectionTitle}>What else can you do?</div>
        <div className={style.infoBox}>
          <div className={style.info}>
            <img className={style.logo} src={privateSendLogo} alt="" />
            <span className={style.title}>Private Send</span>
            <div className={style.subtitle}>
              Send to any Layer 1 address or internally to any Aztec alias with full privacy.
            </div>
          </div>
          <div className={style.info}>
            <img className={style.logo} src={privateShieldLogo} alt="" />
            <span className={style.title}>Private Shield</span>
            <div className={style.subtitle}>
              Shield funds from Layer 1 to gain access to private DeFi opportunities.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
