/**
 * Generic use case interface
 * All use cases must implement this interface with specific input and output types
 *
 * @template TInput - The input type for the use case
 * @template TOutput - The output type for the use case
 *
 * @example
 * export class GetProductsUseCase implements IUseCase<IProductFiltersDTO, IPaginationResult> {
 *   async execute(input: IProductFiltersDTO): Promise<IPaginationResult> {
 *     // Implementation
 *   }
 * }
 */
export interface IUseCase<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>;
}
