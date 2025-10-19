---
search: false
---

## Installation usgin Stapler <Badge v-if="$frontmatter?.aggregation?.stplr?.build === 'unofficial'" type="danger" text="Unofficial build" />

If you have the [stplr](/en/package-manager/stplr/) package, you can install **{{ $frontmatter?.appstream?.name }}** with one command:

```shell-vue
stplr in {{ $frontmatter?.aggregation?.stplr?.id }}
```

To install the package **{{ $frontmatter?.appstream?.name }}**, you need to connect the **Aides** repository:

```sh
stplr repo add aides https://altlinux.space/aides-community/aides.git
```

:::danger Disclaimer
Use packages and instructions only at your own risk. Packages are built locally, so check the source code and build scripts.
:::
