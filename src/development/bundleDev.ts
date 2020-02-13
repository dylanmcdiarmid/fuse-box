import { IBundleWriteResponse } from '../bundle/bundle';
import { createBundleRouter } from '../bundle/bundleRouter';
import { IRunResponse } from '../core/IRunResponse';
import { Context } from '../core/context';
import { createServer, IServer } from '../devServer/server';
import { IBundleContext } from '../moduleResolver/bundleContext';
import { IModule } from '../moduleResolver/module';
import { ModuleResolver } from '../moduleResolver/moduleResolver';

export interface IBundleDevResponse {
  bundleContext?: IBundleContext;
  bundles: Array<IBundleWriteResponse>;
  entries?: Array<IModule>;
  modules?: Array<IModule>;
  server?: IServer;
}
export async function bundleDev(props: { ctx: Context; rebundle?: boolean }): Promise<IBundleDevResponse> {
  const { ctx, rebundle } = props;
  ctx.log.startStreaming();
  ctx.log.startTimeMeasure();
  ctx.log.flush();
  ctx.isWorking = true;
  const ict = ctx.ict;

  const { bundleContext, entries, modules } = ModuleResolver(ctx, ctx.config.entries);
  if (modules) {
    const router = createBundleRouter({ ctx, entries });
    router.generateBundles(modules);
    await ict.resolve();
    const bundles = await router.writeBundles();
    // write the manifest
    await router.writeManifest(bundles);

    if (bundleContext.cache) await bundleContext.cache.write();
    ctx.isWorking = false;

    let server: IServer;
    if (ctx.config.target === 'electron' || ctx.config.target === 'server') {
      server = createServer(ctx, bundles);
    }

    const response: IRunResponse = {
      bundleContext,
      bundles,
      entries,
      modules,
      server,
    };

    ict.sync(rebundle ? 'rebundle' : 'complete', response);
    return response;
  }
}
